import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { resolveAiModel } from "@/lib/ai/models";

export async function POST(request: NextRequest) {
    try {
        const { messages, sessionContext, knowledgeBase, agentSkill, aiModel } =
            await request.json();
        const apiKey = process.env.GEMINI_API_KEY?.trim();

        if (!apiKey) {
            return NextResponse.json(
                { error: "Gemini API key not configured" },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const selectedModel = resolveAiModel(aiModel);
        const model = genAI.getGenerativeModel({ model: selectedModel });

        // Build the system prompt with user context
        const systemPrompt = `You are a professional interview coach. You are conducting a mock interview to help the candidate prepare.

## Interview Context
- Company: ${sessionContext.companyName}
- Role: ${sessionContext.role}
- Job Description: ${sessionContext.jobDescription || "Not provided"}
${sessionContext.companyWebsite ? `- Company Website: ${sessionContext.companyWebsite}` : ""}

## Candidate Profile
${knowledgeBase || "No profile information provided yet."}

## Agent Skill
${agentSkill || "No additional style or behavior instructions provided."}
Treat these as persistent behavior instructions for your tone, structure, depth, wording, and coaching style throughout this interview.

## Your Behavior
1. Ask ONE interview question at a time, relevant to the role and company.
2. After the candidate responds, provide specific, actionable feedback:
   - ✅ What they did well
   - 💡 How they could improve (specific wording, structure, examples)
   - Give a brief score out of 10
3. Then ask the next question.
4. Use the STAR method (Situation, Task, Action, Result) framework when coaching.
5. Tailor questions to the specific company and role.
6. Reference the candidate's actual experience from their profile when giving feedback.
7. Be encouraging but honest — like a senior mentor preparing someone for a real interview.
8. Format your responses in markdown for readability.`;

        // Convert message history to Gemini format
        const chatHistory = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
            role: msg.role === "ai" ? "model" : "user",
            parts: [{ text: msg.content }],
        }));

        const chat = model.startChat({
            history: chatHistory,
            systemInstruction: systemPrompt,
        });

        const lastMessage = messages[messages.length - 1];

        // Retry with exponential backoff on 503/429 (overload)
        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const result = await chat.sendMessage(lastMessage.content);
                const response = result.response.text();
                return NextResponse.json({ response, model: selectedModel });
            } catch (err: unknown) {
                lastError = err;
                const msg = err instanceof Error ? err.message : String(err);
                if ((msg.includes("503") || msg.includes("429") || msg.includes("UNAVAILABLE") || msg.includes("RESOURCE_EXHAUSTED")) && attempt < 2) {
                    console.warn(`[Practice] Retrying (${attempt + 1}/3) after overload...`);
                    await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
                    continue;
                }
                throw err;
            }
        }
        throw lastError;
    } catch (error: unknown) {
        console.error("Practice AI error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "AI request failed" },
            { status: 500 }
        );
    }
}
