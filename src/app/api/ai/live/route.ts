import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { DEFAULT_AI_MODEL, resolveAiModel } from "@/lib/ai/models";

function getErrorMessage(error: unknown) {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (typeof error === "string" && error) {
        return error;
    }

    try {
        const serialized = JSON.stringify(error);
        if (serialized && serialized !== "{}") {
            return serialized;
        }
    } catch {
        // Fall through to the generic message.
    }

    return "Failed to process transcript";
}

/**
 * Streams interview answer suggestions from Gemini.
 * Uses generateContentStream for word-by-word streaming back to the client.
 */
export async function POST(request: NextRequest) {
    try {
        const apiKey = process.env.GEMINI_API_KEY?.trim();

        if (!apiKey) {
            return Response.json(
                { error: "Gemini API key not configured" },
                { status: 500 }
            );
        }

        const {
            transcript,
            sessionContext,
            knowledgeBase,
            agentSkill,
            conversationHistory,
            aiModel,
        } = await request.json();

        const selectedModel = resolveAiModel(aiModel);

        // If no transcript, return config info (initial handshake)
        if (!transcript) {
            return Response.json({
                model: selectedModel,
                status: "ready",
            });
        }

        const ai = new GoogleGenAI({ apiKey });

        const systemInstruction = `You ARE the candidate in this interview. Answer every question in FIRST PERSON as if you are the one being interviewed. Use the candidate's actual experience, skills, and background to craft the most impressive, authentic answer possible.

## Interview Context
- Company: ${sessionContext?.companyName || "Unknown"}
- Role: ${sessionContext?.role || "Unknown"}
- Job Description: ${sessionContext?.jobDescription || "Not provided"}

## Your Background (the candidate's real profile)
${knowledgeBase || "No profile information provided."}

## Agent Skill
${agentSkill || "No additional style or behavior instructions provided."}
Treat these as persistent behavior instructions for answer tone, structure, depth, wording, and style throughout this interview.

## Rules
- Answer in FIRST PERSON ("I", "my", "we") — you ARE the candidate
- Give the BEST possible answer using the candidate's real experience
- Be specific: use real numbers, real projects, real technologies from the profile
- Sound natural and confident, like a top performer in a real interview
- Keep answers concise but powerful — 3-5 sentences max
- If the profile doesn't cover something, give a strong general answer that sounds authentic
- NEVER say "you should say" or "consider mentioning" — just give the answer directly

## IMPORTANT: Mixed Audio
The transcript may contain BOTH the interviewer's voice AND the candidate's own voice.
- ONLY respond to the INTERVIEWER's questions
- IGNORE any text that sounds like an answer or response (that's the candidate speaking)
- If the transcript is mostly someone answering/responding (not asking), respond with NO_QUESTION
- Look for question patterns: "tell me about", "how would you", "what is your", "can you describe", "why did you", etc.
- Statements, affirmations like "okay", "right", "I see", or answers are NOT questions

If the transcript is NOT a question from the interviewer (small talk, introductions, statements, or the candidate answering), respond with exactly:
NO_QUESTION

Format responses as:
**Detected Question:** [the question]

**Answer:**
[Your first-person answer here, ready to speak]

${conversationHistory ? `\n## Previous conversation:\n${conversationHistory}` : ""}`;

        // Use streaming for word-by-word output (with retry on overload)
        let stream;
        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                stream = await ai.models.generateContentStream({
                    model: selectedModel || DEFAULT_AI_MODEL,
                    contents: [
                        {
                            role: "user",
                            parts: [
                                {
                                    text: `The interviewer just said: "${transcript}"

Is this a question that needs an answer? If yes, provide a suggested answer. If no, respond with NO_QUESTION.`,
                                },
                            ],
                        },
                    ],
                    config: {
                        systemInstruction,
                        temperature: 0.7,
                        maxOutputTokens: 1024,
                    },
                });
                break; // Success, exit retry loop
            } catch (err: unknown) {
                lastError = err;
                const msg = err instanceof Error ? err.message : String(err);
                if ((msg.includes("503") || msg.includes("429") || msg.includes("UNAVAILABLE") || msg.includes("RESOURCE_EXHAUSTED")) && attempt < 2) {
                    console.warn(`[Live] Retrying (${attempt + 1}/3) after overload...`);
                    await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
                    continue;
                }
                throw err;
            }
        }
        if (!stream) throw lastError;

        // Create a ReadableStream that emits Server-Sent Events
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        const text = chunk.text || "";
                        if (text) {
                            // Send as SSE data event
                            controller.enqueue(
                                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                            );
                        }
                    }
                    // Signal end of stream
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    controller.close();
                } catch (err) {
                    console.error("[Live API] Stream error:", err);
                    controller.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({ error: getErrorMessage(err) })}\n\n`
                        )
                    );
                    controller.close();
                }
            },
        });

        return new Response(readable, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (error: unknown) {
        console.error("[Live API] Error:", error);
        return Response.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
