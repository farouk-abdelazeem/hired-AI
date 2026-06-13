"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { AI_MODELS, DEFAULT_AI_MODEL } from "@/lib/ai/models";
import { useLocalWhisper, WHISPER_MODELS, DEFAULT_WHISPER_MODEL } from "@/lib/ai/use-local-whisper";
import {
    doc,
    getDoc,
    collection,
    getDocs,
    updateDoc,
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
    Radio,
    ArrowLeft,
    MonitorUp,
    MicOff,
    Mic,
    StopCircle,
    Bot,
    Building2,
    Sparkles,
    Loader2,
    Volume2,
    AlertTriangle,
    Zap,
} from "lucide-react";

interface SessionData {
    companyName: string;
    companyWebsite: string;
    role: string;
    jobDescription: string;
    type: string;
    aiModel?: string;
}

interface Suggestion {
    id: number;
    question: string;
    answer: string;
    timestamp: number;
}

async function readApiError(response: Response, fallback: string) {
    try {
        const data = await response.clone().json();
        if (data?.error) return String(data.error);
        if (data?.message) return String(data.message);
    } catch {
        // Fall back to text below.
    }

    try {
        const text = await response.text();
        if (text) return text;
    } catch {
        // Use the fallback.
    }

    return fallback;
}

/**
 * TypeScript declarations for Web Speech API.
 * These types may not be available in all environments.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognitionType = any;

export default function LiveSessionPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const sessionId = params.id as string;

    const [session, setSession] = useState<SessionData | null>(null);
    const [sessionLoading, setSessionLoading] = useState(true);
    const [isLive, setIsLive] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [currentTranscript, setCurrentTranscript] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const [error, setError] = useState("");
    const [audioLevel, setAudioLevel] = useState(0);
    const [micLevel, setMicLevel] = useState(0);
    const [audioChunkCount, setAudioChunkCount] = useState(0);
    const [listeningPaused, setListeningPaused] = useState(false);
    const [autoPauseEnabled, setAutoPauseEnabled] = useState(true);
    const [selectedModel, setSelectedModel] = useState(DEFAULT_AI_MODEL);
    const [useLocalTranscription, setUseLocalTranscription] = useState(true);
    const useLocalRef = useRef(true);
    const [whisperModelId, setWhisperModelId] = useState(DEFAULT_WHISPER_MODEL);

    const displayStreamRef = useRef<MediaStream | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const animFrameRef = useRef<number>(0);
    const micAnimFrameRef = useRef<number>(0);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const micAnalyserRef = useRef<AnalyserNode | null>(null);
    const recognitionRef = useRef<SpeechRecognitionType>(null);
    const isRecognizingRef = useRef<boolean>(false);
    const sessionContextRef = useRef<any>(null);
    const knowledgeBaseRef = useRef<string>("");
    const agentSkillRef = useRef<string>("");
    const aiModelRef = useRef<string>(DEFAULT_AI_MODEL);
    const conversationHistoryRef = useRef<string>("");
    const processingRef = useRef<boolean>(false);
    const listeningPausedRef = useRef<boolean>(false);
    const autoPauseEnabledRef = useRef<boolean>(true);
    const manualPauseRef = useRef<boolean>(false);

    // Local Whisper transcription
    const whisper = useLocalWhisper({
        onTranscript: useCallback((text: string) => {
            if (listeningPausedRef.current) return;
            console.log(`[Whisper] Transcript: "${text.substring(0, 80)}"`);
            setCurrentTranscript(text);
            if (text.length > 10) {
                processTranscriptRef.current?.(text);
            }
        }, []),
        whisperModel: whisperModelId,
        chunkDurationSec: 4,
    });

    const processTranscriptRef = useRef<((t: string) => void) | null>(null);

    // Load session
    useEffect(() => {
        if (!user) return;
        const load = async () => {
            const sessionDoc = await getDoc(
                doc(db, "users", user.uid, "sessions", sessionId)
            );
            if (!sessionDoc.exists()) {
                router.push("/dashboard/sessions");
                return;
            }
            const data = sessionDoc.data() as SessionData;
            setSession(data);
            setSelectedModel(data.aiModel || DEFAULT_AI_MODEL);
            aiModelRef.current = data.aiModel || DEFAULT_AI_MODEL;
            setSessionLoading(false);
        };
        load();
    }, [user, sessionId, router]);


    // Audio level monitoring for the display stream
    const startAudioMonitoring = useCallback((stream: MediaStream) => {
        try {
            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const tick = () => {
                analyser.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                setAudioLevel(avg / 128);
                animFrameRef.current = requestAnimationFrame(tick);
            };
            tick();
        } catch (err) {
            console.warn("[Live] Audio monitoring setup failed:", err);
        }
    }, []);

    /**
     * Send a transcript to the server and stream the AI response word-by-word.
     */
    const processTranscript = useCallback(
        async (transcript: string) => {
            if (processingRef.current) return;
            processingRef.current = true;

            // If using local Whisper, clear the transcript display after a short delay
            if (useLocalRef.current) {
                setTimeout(() => setCurrentTranscript(""), 1500);
            }

            try {
                console.log(
                    `[Live] Sending transcript: "${transcript.substring(0, 80)}..."`
                );

                const res = await fetch("/api/ai/live", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        transcript,
                        sessionContext: sessionContextRef.current,
                        knowledgeBase: knowledgeBaseRef.current,
                        agentSkill: agentSkillRef.current,
                        aiModel: aiModelRef.current,
                        conversationHistory:
                            conversationHistoryRef.current,
                    }),
                });

                if (!res.ok) {
                    const message = await readApiError(
                        res,
                        "Failed to get an AI answer."
                    );
                    setError(message);
                    setStatusMessage("");
                    return;
                }

                // Create a placeholder suggestion card that we'll update in real-time
                const suggestionId = Date.now();
                setSuggestions((prev) => [
                    ...prev,
                    {
                        id: suggestionId,
                        question: "Analyzing...",
                        answer: "",
                        timestamp: Date.now(),
                    },
                ]);

                // Read the SSE stream
                const reader = res.body?.getReader();
                if (!reader) return;

                const decoder = new TextDecoder();
                let fullText = "";
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    // Process complete SSE events (separated by double newlines)
                    const events = buffer.split("\n\n");
                    buffer = events.pop() || ""; // Keep incomplete event in buffer

                    for (const event of events) {
                        const line = event.trim();
                        if (!line.startsWith("data: ")) continue;

                        const data = line.slice(6); // Remove "data: " prefix
                        if (data === "[DONE]") continue;

                        try {
                            const { text: chunk, error } = JSON.parse(data);
                            if (error) {
                                setError(String(error));
                                continue;
                            }
                            if (chunk) {
                                fullText += chunk;

                                // Parse question and answer on the fly
                                const questionMatch = fullText.match(
                                    /\*\*Detected Question:\*\*\s*(.*?)(?:\n|$)/
                                );
                                const answerMatch = fullText.match(
                                    /\*\*Answer:\*\*\s*([\s\S]*)/
                                );

                                const question = questionMatch
                                    ? questionMatch[1].trim()
                                    : "Analyzing...";
                                const answer = answerMatch
                                    ? answerMatch[1].trim()
                                    : "";

                                // Update the suggestion card in real-time
                                setSuggestions((prev) =>
                                    prev.map((s) =>
                                        s.id === suggestionId
                                            ? { ...s, question, answer }
                                            : s
                                    )
                                );
                            }
                        } catch {
                            // Skip malformed JSON
                        }
                    }
                }

                // Check if it was NO_QUESTION
                if (fullText.includes("NO_QUESTION")) {
                    console.log("[Live] No question detected");
                    // Remove the placeholder card
                    setSuggestions((prev) =>
                        prev.filter((s) => s.id !== suggestionId)
                    );
                    return;
                }

                // Final parse for conversation history
                const questionMatch = fullText.match(
                    /\*\*Detected Question:\*\*\s*(.*?)(?:\n|$)/
                );
                const answerMatch = fullText.match(
                    /\*\*Answer:\*\*\s*([\s\S]*)/
                );
                const question = questionMatch
                    ? questionMatch[1].trim()
                    : "Interview question detected";
                const answer = answerMatch
                    ? answerMatch[1].trim()
                    : fullText;

                conversationHistoryRef.current += `\nQ: ${question}\nSuggested: ${answer}\n`;
                console.log("[Live] Streaming complete, length:", fullText.length);
            } catch (err) {
                console.error("[Live] Error processing transcript:", err);
            } finally {
                processingRef.current = false;
            }
        },
        []
    );

    // Keep processTranscriptRef in sync
    processTranscriptRef.current = processTranscript;

    /**
     * Start the browser's SpeechRecognition for real-time transcription.
     */
    const startSpeechRecognition = useCallback(() => {
        const SpeechRecognitionClass =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognitionClass) {
            setError(
                "Speech recognition is not supported in this browser. Please use Chrome or Edge."
            );
            return;
        }

        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1;

        let finalTranscriptBuffer = "";
        let chunkCount = 0;

        recognition.onresult = (event: any) => {
            let interimTranscript = "";
            let currentFinal = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    currentFinal += result[0].transcript;
                } else {
                    interimTranscript += result[0].transcript;
                }
            }

            // If listening is paused (user is speaking), still process final
            // results that were already captured before the pause, but skip
            // showing interim transcripts
            if (listeningPausedRef.current) {
                // Still process any final transcript that was in-flight
                if (currentFinal) {
                    finalTranscriptBuffer += " " + currentFinal;
                    chunkCount++;
                    setAudioChunkCount(chunkCount);

                    const trimmed = finalTranscriptBuffer.trim();
                    if (trimmed.length > 20) {
                        processTranscript(trimmed);
                        finalTranscriptBuffer = "";
                    }
                }
                setCurrentTranscript("⏸ Paused — you're speaking");
                return;
            }

            // Show real-time interim transcript
            if (interimTranscript) {
                setCurrentTranscript(interimTranscript);
            }

            // When we get a final result, accumulate it
            if (currentFinal) {
                finalTranscriptBuffer += " " + currentFinal;
                chunkCount++;
                setAudioChunkCount(chunkCount);
                setCurrentTranscript("");

                // Send to Gemini for analysis
                // Wait for a complete thought (~sentence) before processing
                const trimmed = finalTranscriptBuffer.trim();
                if (trimmed.length > 20) {
                    processTranscript(trimmed);
                    finalTranscriptBuffer = "";
                }
            }
        };

        recognition.onerror = (event: any) => {
            console.warn("[Live] Speech recognition error:", event.error);
            if (event.error === "not-allowed") {
                setError(
                    "Microphone access denied. Please allow microphone access for speech recognition."
                );
            } else if (event.error === "network") {
                // Transient network error — auto-restart after brief delay
                console.log("[Live] Network error, auto-restarting in 1s...");
                if (isRecognizingRef.current) {
                    setTimeout(() => {
                        if (isRecognizingRef.current) {
                            try {
                                recognition.start();
                                console.log("[Live] ✅ Speech recognition restarted after network error");
                            } catch {
                                // Already running
                            }
                        }
                    }, 1000);
                }
            } else if (event.error !== "no-speech" && event.error !== "aborted") {
                setError(`Speech recognition error: ${event.error}`);
            }
        };

        recognition.onend = () => {
            console.log("[Live] Speech recognition ended");
            // Auto-restart if still in session
            if (isRecognizingRef.current) {
                console.log("[Live] Restarting speech recognition...");
                try {
                    recognition.start();
                } catch {
                    // Already started
                }
            }
        };

        recognitionRef.current = recognition;
        isRecognizingRef.current = true;

        try {
            recognition.start();
            console.log("[Live] ✅ Speech recognition started");
        } catch (err) {
            console.error("[Live] Failed to start speech recognition:", err);
            setError("Failed to start speech recognition.");
        }
    }, [processTranscript]);

    /**
     * Initialize the live session: fetch context, verify API, start recognition.
     */
    const connectToGemini = useCallback(
        async () => {
            if (!session || !user) return;
            setIsConnecting(true);
            setError("");
            setStatusMessage("Fetching AI configuration...");

            try {
                // 1. Fetch user's knowledge base
                const knowledgeSnap = await getDocs(
                    collection(db, "users", user.uid, "knowledge")
                );
                const userDoc = await getDoc(doc(db, "users", user.uid));
                const userData = userDoc.exists() ? userDoc.data() : {};
                const bio = userData.bio || "";
                const agentSkill = userData.agentSkill || "";

                let knowledgeBase = bio
                    ? `Professional Summary: ${bio}\n\n`
                    : "";
                knowledgeSnap.forEach((d) => {
                    const data = d.data();
                    knowledgeBase += `[${data.category}] ${data.title}: ${data.content}\n\n`;
                });

                // Store context for reuse
                sessionContextRef.current = {
                    companyName: session.companyName,
                    companyWebsite: session.companyWebsite,
                    role: session.role,
                    jobDescription: session.jobDescription,
                };
                knowledgeBaseRef.current = knowledgeBase;
                agentSkillRef.current = agentSkill;
                aiModelRef.current = session.aiModel || DEFAULT_AI_MODEL;
                conversationHistoryRef.current = "";

                // 2. Verify server is ready
                setStatusMessage("Connecting to AI service...");
                const configRes = await fetch("/api/ai/live", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sessionContext: sessionContextRef.current,
                        knowledgeBase,
                        agentSkill,
                        aiModel: aiModelRef.current,
                    }),
                });

                if (!configRes.ok) {
                    setError(
                        await readApiError(configRes, "Failed to connect to AI service")
                    );
                    setIsConnecting(false);
                    setStatusMessage("");
                    return;
                }

                const { model: modelName } = await configRes.json();
                console.log("[Live] Config received. Model:", modelName);

                // 3. Start transcription
                if (useLocalRef.current) {
                    // Local Whisper: init model, then start capturing display audio
                    setStatusMessage("Loading local Whisper model...");
                    await whisper.initWhisper();
                    setStatusMessage("Starting local transcription...");

                    // Feed display audio to Whisper
                    if (displayStreamRef.current) {
                        const audioTracks = displayStreamRef.current.getAudioTracks();
                        if (audioTracks.length > 0) {
                            whisper.startCapturing(displayStreamRef.current);
                        } else {
                            setError("No audio in screen share. Check 'Share audio' when sharing.");
                        }
                    }

                    console.log(
                        "[Live] ✅ Pipeline: Display Audio → Local Whisper → Gemini"
                    );
                } else {
                    // Cloud: use Chrome SpeechRecognition
                    setStatusMessage("Starting speech recognition...");
                    startSpeechRecognition();
                    console.log(
                        "[Live] ✅ Pipeline: Mic → SpeechRecognition → Gemini"
                    );
                }

                setIsConnecting(false);
                setIsLive(true);
                setStatusMessage("Listening for interviewer...");
            } catch (err: unknown) {
                console.warn("[Live] Connection failed:", err);
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to connect to AI service"
                );
                setIsConnecting(false);
                setStatusMessage("");
            }
        },
        [session, user, startSpeechRecognition, whisper]
    );

    // Mic-based Voice Activity Detection (VAD)
    const startMicVAD = useCallback((micStream: MediaStream) => {
        try {
            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaStreamSource(micStream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.85;
            source.connect(analyser);
            micAnalyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const VAD_THRESHOLD = 0.15; // Mic volume threshold to detect speech
            const RESUME_DELAY_MS = 600; // How long silence before auto-resuming
            let silenceStart: number | null = null;

            const tick = () => {
                analyser.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                const normalized = avg / 128;
                setMicLevel(normalized);

                // Only auto-pause if enabled and not manually paused/overridden
                if (autoPauseEnabledRef.current && !manualPauseRef.current) {
                    if (normalized > VAD_THRESHOLD) {
                        // User is speaking
                        silenceStart = null;
                        if (!listeningPausedRef.current) {
                            listeningPausedRef.current = true;
                            setListeningPaused(true);
                            setCurrentTranscript("⏸ Auto-paused — you're speaking");
                        }
                    } else {
                        // Silence — start cooldown timer
                        if (listeningPausedRef.current) {
                            if (silenceStart === null) {
                                silenceStart = performance.now();
                            } else if (performance.now() - silenceStart > RESUME_DELAY_MS) {
                                listeningPausedRef.current = false;
                                setListeningPaused(false);
                                setCurrentTranscript("");
                                silenceStart = null;
                            }
                        }
                    }
                }

                micAnimFrameRef.current = requestAnimationFrame(tick);
            };
            tick();
            console.log("[Live] ✅ Mic VAD started");
        } catch (err) {
            console.warn("[Live] Mic VAD setup failed:", err);
        }
    }, []);

    const startCapture = async () => {
        setError("");
        setSuggestions([]);
        setAudioChunkCount(0);
        try {
            // Request screen share with audio (for video preview)
            const displayStream =
                await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true,
                });
            displayStreamRef.current = displayStream;

            // Check if audio was actually shared
            const audioTracks = displayStream.getAudioTracks();
            if (audioTracks.length > 0) {
                console.log(
                    "[Live] Audio track acquired:",
                    audioTracks[0].label
                );
            }

            // Attach display stream to video preview
            if (videoRef.current) {
                videoRef.current.srcObject = displayStream;
            }

            // Start audio level monitoring on display audio
            if (audioTracks.length > 0) {
                startAudioMonitoring(displayStream);
            }

            // Request microphone for voice activity detection
            try {
                const micStream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true },
                });
                micStreamRef.current = micStream;
                startMicVAD(micStream);
            } catch (micErr) {
                console.warn("[Live] Mic access denied — auto-pause unavailable:", micErr);
                setAutoPauseEnabled(false);
                autoPauseEnabledRef.current = false;
            }

            // Handle stream end (user stops sharing)
            displayStream.getVideoTracks()[0].onended = () => {
                stopCapture();
            };

            setIsCapturing(true);

            // Connect to Gemini and start speech recognition
            connectToGemini();
        } catch (err: unknown) {
            if (err instanceof Error && err.name === "NotAllowedError") {
                setError(
                    "Screen sharing was denied. Please allow screen sharing to use the live interview feature."
                );
            } else {
                setError("Failed to start capture. Please try again.");
                console.error("[Live] Capture error:", err);
            }
        }
    };

    const stopCapture = useCallback(() => {
        // Stop speech recognition
        isRecognizingRef.current = false;
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {
                // already stopped
            }
            recognitionRef.current = null;
        }

        // Stop local Whisper capture
        whisper.stopCapturing();

        // Stop media streams
        displayStreamRef.current?.getTracks().forEach((t) => t.stop());
        micStreamRef.current?.getTracks().forEach((t) => t.stop());
        displayStreamRef.current = null;
        micStreamRef.current = null;
        cancelAnimationFrame(animFrameRef.current);
        cancelAnimationFrame(micAnimFrameRef.current);

        // Clear video preview
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setIsCapturing(false);
        setIsLive(false);
        setIsConnecting(false);
        setAudioLevel(0);
        setMicLevel(0);
        setCurrentTranscript("");
        setStatusMessage("");
        conversationHistoryRef.current = "";
        manualPauseRef.current = false;
    }, [whisper]);

    // Toggle listening pause (for when user is speaking)
    const toggleListeningPause = useCallback(() => {
        const newState = !listeningPausedRef.current;
        // Mark as manual override so VAD doesn't fight with it
        manualPauseRef.current = newState;
        listeningPausedRef.current = newState;
        setListeningPaused(newState);
        if (newState) {
            setCurrentTranscript("⏸ Paused — you're speaking");
        } else {
            setCurrentTranscript("");
        }
        console.log(`[Live] Listening ${newState ? "paused (manual)" : "resumed (manual)"}`);
    }, []);

    // Keyboard shortcut: hold Space to pause listening while you speak
    useEffect(() => {
        if (!isLive) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Only if Space is pressed and not in an input/textarea
            if (
                e.code === "Space" &&
                !manualPauseRef.current &&
                !(e.target instanceof HTMLInputElement) &&
                !(e.target instanceof HTMLTextAreaElement)
            ) {
                e.preventDefault();
                manualPauseRef.current = true;
                listeningPausedRef.current = true;
                setListeningPaused(true);
                setCurrentTranscript("⏸ Paused — you're speaking");
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === "Space" && manualPauseRef.current) {
                e.preventDefault();
                manualPauseRef.current = false;
                listeningPausedRef.current = false;
                setListeningPaused(false);
                setCurrentTranscript("");
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [isLive]);

    const toggleMute = () => {
        if (micStreamRef.current) {
            micStreamRef.current.getAudioTracks().forEach((t) => {
                t.enabled = !t.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const handleModelChange = async (model: string) => {
        if (!user) return;
        setSelectedModel(model);
        aiModelRef.current = model;
        setSession((prev) => (prev ? { ...prev, aiModel: model } : prev));
        await updateDoc(doc(db, "users", user.uid, "sessions", sessionId), {
            aiModel: model,
        });
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCapture();
        };
    }, [stopCapture]);

    if (sessionLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-muted-foreground text-sm">
                        Loading session...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-1px)]">
            {/* Header */}
            <div className="border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => router.push("/dashboard/sessions")}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold">
                                {session?.role}
                            </h2>
                            <Badge
                                variant={isLive ? "destructive" : "secondary"}
                                className="text-[10px] gap-1"
                            >
                                {isLive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                )}
                                {isConnecting
                                    ? "CONNECTING..."
                                    : isLive
                                        ? "LIVE"
                                        : "STANDBY"}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Building2 className="w-3 h-3" />
                            {session?.companyName}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        aria-label="AI model"
                        value={selectedModel}
                        onChange={(e) => handleModelChange(e.target.value)}
                        className="h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs"
                    >
                        {AI_MODELS.map((model) => (
                            <option key={model.id} value={model.id}>
                                {model.label}
                            </option>
                        ))}
                    </select>

                    {isCapturing && (
                        <>
                            {/* Audio chunks counter (debug indicator) */}
                            {audioChunkCount > 0 && (
                                <span className="text-[10px] text-muted-foreground tabular-nums">
                                    {audioChunkCount} chunks
                                </span>
                            )}

                            {/* Audio Level Indicator */}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100">
                                <Volume2 className="w-3.5 h-3.5 text-teal-600" />
                                <div className="flex items-end gap-0.5 h-4">
                                    {[0.2, 0.4, 0.6, 0.8, 1].map(
                                        (threshold, i) => (
                                            <div
                                                key={i}
                                                className={`w-1 rounded-full transition-all duration-100 ${audioLevel > threshold
                                                    ? "bg-teal-500"
                                                    : "bg-slate-300"
                                                    }`}
                                                style={{
                                                    height: `${(i + 1) * 4}px`,
                                                }}
                                            />
                                        )
                                    )}
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={toggleMute}
                                className={
                                    isMuted ? "text-destructive" : ""
                                }
                            >
                                {isMuted ? (
                                    <MicOff className="w-3.5 h-3.5" />
                                ) : (
                                    <Mic className="w-3.5 h-3.5" />
                                )}
                            </Button>
                        </>
                    )}

                    {isCapturing ? (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={stopCapture}
                        >
                            <StopCircle className="w-3.5 h-3.5 mr-1.5" />
                            End Session
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            className="glow-primary"
                            onClick={startCapture}
                        >
                            <MonitorUp className="w-3.5 h-3.5 mr-1.5" />
                            Start Capture
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                {!isCapturing ? (
                    /* Pre-capture state */
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center max-w-md mx-auto px-6">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 glow-primary">
                                <Radio className="w-8 h-8 text-primary" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">
                                Ready for Your Interview
                            </h2>
                            <p className="text-muted-foreground text-sm mb-6">
                                Click &quot;Start Capture&quot; to share your
                                interview screen. The AI will listen to the
                                interviewer and provide real-time answer
                                suggestions in this panel.
                            </p>

                            <Card className="border-slate-200 bg-white shadow-sm text-left mb-6">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <MonitorUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium">
                                                Share your screen
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Select the tab or window where
                                                your interview is happening.
                                                Check &quot;Share audio&quot;.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Volume2 className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium">
                                                AI listens to the interviewer
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Speech is transcribed locally
                                                in real-time via your browser.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Zap className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium">
                                                Get instant suggestions
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Answer suggestions appear
                                                within seconds, powered by
                                                Gemini.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {error && (
                                <div className="flex items-center gap-2 text-destructive text-sm mb-4">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <Button
                                className="glow-primary h-11 px-8"
                                onClick={startCapture}
                            >
                                <MonitorUp className="w-4 h-4 mr-2" />
                                Start Capture
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Live HUD — two-column layout */
                    <div className="flex h-full">
                        {/* LEFT COLUMN — Scrollable AI Answers */}
                        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4" ref={scrollRef}>
                            <div className="max-w-2xl mx-auto space-y-4">
                                {/* AI Answer Cards — always at the top */}
                                {[...suggestions].reverse().map((suggestion) => (
                                    <div
                                        key={suggestion.id}
                                    >
                                        <Card className="border-blue-200 bg-blue-50 shadow-sm">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Bot className="w-4 h-4 text-primary" />
                                                    <span className="text-xs font-semibold text-primary">
                                                        AI Answer
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground ml-auto">
                                                        {new Date(
                                                            suggestion.timestamp
                                                        ).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <div className="mb-2">
                                                    <p className="text-xs text-muted-foreground mb-1">
                                                        Detected question:
                                                    </p>
                                                    <p className="text-sm font-medium italic">
                                                        &quot;{suggestion.question}
                                                        &quot;
                                                    </p>
                                                </div>
                                                <div className="mt-3 pt-3 border-t border-blue-200">
                                                    <p className="text-xs text-primary font-medium mb-1">
                                                        Your answer:
                                                    </p>
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                        {suggestion.answer}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ))}

                                {/* Connection status — below answers */}
                                {isConnecting && (
                                    <Card className="border-blue-200 bg-blue-50 shadow-sm">
                                        <CardContent className="p-3">
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                                <span className="text-sm text-primary font-medium">
                                                    {statusMessage ||
                                                        "Connecting..."}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Error display — below answers */}
                                {error && (
                                    <Card className="border-red-200 bg-red-50 shadow-sm">
                                        <CardContent className="p-3">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-destructive" />
                                                <span className="text-sm text-destructive">
                                                    {error}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {suggestions.length === 0 &&
                                    !currentTranscript &&
                                    isLive && (
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                                                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                                            </div>
                                            <p className="text-muted-foreground text-sm">
                                                Listening for the interviewer...
                                            </p>
                                            <p className="text-muted-foreground text-xs mt-1">
                                                Answers will appear here in
                                                real-time.
                                            </p>
                                        </div>
                                    )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN — PiP, Transcript & Controls */}
                        <div className="w-80 shrink-0 border-l border-slate-200 bg-slate-50 flex flex-col overflow-y-auto">
                            {/* PiP Video Preview */}
                            <div className="p-4">
                                <div className="relative rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-black">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className="w-full h-auto rounded-xl"
                                    />
                                    <div className="absolute top-2 left-2">
                                        <Badge
                                            variant="destructive"
                                            className="text-[9px] gap-1 px-1.5 py-0.5"
                                        >
                                            <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                                            SCREEN
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Live Transcript */}
                            <div className="px-4 pb-3">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Live Transcript
                                </p>
                                <div className="rounded-lg bg-white border border-slate-200 p-3 min-h-[60px]">
                                    {currentTranscript ? (
                                        <div className="flex items-start gap-2">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600 shrink-0 mt-0.5" />
                                            <span className="text-xs text-teal-700 leading-relaxed">
                                                {currentTranscript}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse shrink-0" />
                                            <span className="text-xs text-muted-foreground">
                                                {statusMessage || "Waiting for speech..."}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Session Info */}
                            <div className="px-4 pb-3">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Session Info
                                </p>
                                <div className="rounded-lg bg-white border border-slate-200 p-3 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Company</span>
                                        <span className="text-xs font-medium">{session?.companyName}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Role</span>
                                        <span className="text-xs font-medium truncate ml-2 max-w-[140px]">{session?.role}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Answers</span>
                                        <span className="text-xs font-medium">{suggestions.length}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Transcription</span>
                                        <select
                                            aria-label="Transcription mode"
                                            value={useLocalTranscription ? "local" : "cloud"}
                                            disabled={isCapturing}
                                            onChange={(e) => {
                                                const isLocal = e.target.value === "local";
                                                setUseLocalTranscription(isLocal);
                                                useLocalRef.current = isLocal;
                                            }}
                                            className="h-6 rounded border border-slate-200 bg-slate-50 px-1.5 text-[10px] font-medium"
                                        >
                                            <option value="local">🖥 Local (Whisper)</option>
                                            <option value="cloud">☁️ Cloud (Chrome)</option>
                                        </select>
                                    </div>
                                    {useLocalTranscription && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">Whisper Model</span>
                                            <select
                                                aria-label="Whisper model"
                                                value={whisperModelId}
                                                disabled={isCapturing}
                                                onChange={(e) => {
                                                    setWhisperModelId(e.target.value);
                                                    whisper.terminate();
                                                }}
                                                className="h-6 rounded border border-slate-200 bg-slate-50 px-1.5 text-[10px] font-medium"
                                            >
                                                {WHISPER_MODELS.map((m) => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* Whisper model loading progress */}
                                {whisper.isModelLoading && (
                                    <div className="mt-2 rounded-lg bg-blue-50 border border-blue-200 p-2.5 space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                            <span className="text-[10px] text-primary font-medium">
                                                {whisper.modelMessage}
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-blue-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all duration-300"
                                                style={{ width: `${whisper.modelProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Quick Actions */}
                            <div className="px-4 pb-4 mt-auto">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Controls
                                </p>
                                <div className="space-y-2">
                                    {/* Auto-pause toggle */}
                                    <div
                                        className={`flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer transition-colors ${autoPauseEnabled
                                                ? "border-teal-300 bg-teal-50"
                                                : "border-slate-200 bg-white"
                                            }`}
                                        onClick={() => {
                                            const next = !autoPauseEnabled;
                                            setAutoPauseEnabled(next);
                                            autoPauseEnabledRef.current = next;
                                            if (!next && listeningPausedRef.current && !manualPauseRef.current) {
                                                listeningPausedRef.current = false;
                                                setListeningPaused(false);
                                                setCurrentTranscript("");
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Mic className={`w-3.5 h-3.5 ${autoPauseEnabled ? "text-teal-600" : "text-slate-400"}`} />
                                            <div>
                                                <p className="text-xs font-medium">Auto-Pause</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Detects your voice via mic
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`w-8 h-4 rounded-full transition-colors flex items-center ${autoPauseEnabled ? "bg-teal-500 justify-end" : "bg-slate-300 justify-start"
                                            }`}>
                                            <div className="w-3 h-3 rounded-full bg-white mx-0.5 shadow-sm" />
                                        </div>
                                    </div>

                                    {/* Mic level indicator (when auto-pause is on) */}
                                    {autoPauseEnabled && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100">
                                            <span className="text-[10px] text-muted-foreground">Mic</span>
                                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-100 ${micLevel > 0.15 ? "bg-amber-500" : "bg-teal-500"
                                                        }`}
                                                    style={{ width: `${Math.min(micLevel * 100, 100)}%` }}
                                                />
                                            </div>
                                            <span className={`text-[9px] font-medium ${micLevel > 0.15 ? "text-amber-600" : "text-teal-600"
                                                }`}>
                                                {micLevel > 0.15 ? "Speaking" : "Silent"}
                                            </span>
                                        </div>
                                    )}

                                    <Button
                                        variant={listeningPaused ? "default" : "outline"}
                                        size="sm"
                                        className={`w-full justify-start text-xs ${listeningPaused
                                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                                            : ""
                                            }`}
                                        onClick={toggleListeningPause}
                                    >
                                        {listeningPaused ? (
                                            <>
                                                <Mic className="w-3.5 h-3.5 mr-2" />
                                                Resume Listening
                                            </>
                                        ) : (
                                            <>
                                                <MicOff className="w-3.5 h-3.5 mr-2" />
                                                Pause (I&apos;m Speaking)
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-[10px] text-muted-foreground px-1">
                                        💡 Hold <kbd className="px-1 py-0.5 bg-slate-200 rounded text-[9px] font-mono">Space</kbd> to manually pause
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start text-xs"
                                        onClick={() => setSuggestions([])}
                                    >
                                        <Sparkles className="w-3.5 h-3.5 mr-2" />
                                        Clear Answers
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
