"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { AI_MODELS, DEFAULT_AI_MODEL } from "@/lib/ai/models";
import {
    doc,
    getDoc,
    collection,
    getDocs,
    updateDoc,
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Mic,
    Send,
    ArrowLeft,
    Bot,
    User,
    Building2,
    RotateCcw,
    Loader2,
} from "lucide-react";

interface Message {
    role: "ai" | "user";
    content: string;
}

interface SessionData {
    companyName: string;
    companyWebsite: string;
    role: string;
    jobDescription: string;
    type: string;
    aiModel?: string;
}

export default function PracticeSessionPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const sessionId = params.id as string;

    const [session, setSession] = useState<SessionData | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sessionLoading, setSessionLoading] = useState(true);
    const [knowledgeContext, setKnowledgeContext] = useState("");
    const [agentSkill, setAgentSkill] = useState("");
    const [selectedModel, setSelectedModel] = useState(DEFAULT_AI_MODEL);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Load session data + initial question
    useEffect(() => {
        if (!user) return;
        const loadSession = async () => {
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

            // Load user's knowledge base
            const knowledgeSnap = await getDocs(
                collection(db, "users", user.uid, "knowledge")
            );
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const userData = userDoc.exists() ? userDoc.data() : {};
            const bio = userData.bio || "";
            setAgentSkill(userData.agentSkill || "");

            let kContext = bio ? `Professional Summary: ${bio}\n\n` : "";
            knowledgeSnap.forEach((doc) => {
                const d = doc.data();
                kContext += `[${d.category}] ${d.title}: ${d.content}\n\n`;
            });
            setKnowledgeContext(kContext);

            // Generate initial AI question
            setMessages([
                {
                    role: "ai",
                    content: `Welcome to your practice interview for the **${data.role}** position at **${data.companyName}**! 🎯\n\nI'll be simulating a real interview experience based on the job description and your profile. I'll ask you questions one at a time, and after each response, I'll provide feedback on your answer's content, structure, and delivery.\n\nLet's begin!\n\n**Question 1:** Tell me about yourself and why you're interested in the ${data.role} role at ${data.companyName}.`,
                },
            ]);
            setSessionLoading(false);
        };
        loadSession();
    }, [user, sessionId, router]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading || !session) return;

        const userMessage = input.trim();
        setInput("");
        const updatedMessages: Message[] = [
            ...messages,
            { role: "user", content: userMessage },
        ];
        setMessages(updatedMessages);
        setIsLoading(true);

        try {
            const res = await fetch("/api/ai/practice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: updatedMessages,
                    sessionContext: {
                        companyName: session.companyName,
                        companyWebsite: session.companyWebsite,
                        role: session.role,
                        jobDescription: session.jobDescription,
                    },
                    knowledgeBase: knowledgeContext,
                    agentSkill,
                    aiModel: selectedModel,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "AI request failed");
            }

            const data = await res.json();
            setMessages((prev) => [
                ...prev,
                { role: "ai", content: data.response },
            ]);
        } catch (err: unknown) {
            const errorMsg =
                err instanceof Error ? err.message : "Something went wrong";
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    content: `⚠️ Error: ${errorMsg}\n\nPlease make sure the Gemini API key is configured in your .env.local file.`,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleModelChange = async (model: string) => {
        if (!user) return;
        setSelectedModel(model);
        setSession((prev) => (prev ? { ...prev, aiModel: model } : prev));
        await updateDoc(doc(db, "users", user.uid, "sessions", sessionId), {
            aiModel: model,
        });
    };

    if (sessionLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-muted-foreground text-sm">Loading session...</p>
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
                            <h2 className="text-sm font-semibold">{session?.role}</h2>
                            <Badge variant="secondary" className="text-[10px]">
                                <Mic className="w-3 h-3 mr-1" />
                                Practice
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
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setMessages([
                                {
                                    role: "ai",
                                    content: `Let's start fresh! 🔄\n\n**Question 1:** Tell me about yourself and why you're interested in the ${session?.role} role at ${session?.companyName}.`,
                                },
                            ]);
                        }}
                    >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        Restart
                    </Button>
                </div>
            </div>

            {/* Chat Area */}
            <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
                <div className="max-w-3xl mx-auto space-y-4">
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"
                                }`}
                        >
                            {msg.role === "ai" && (
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                                    <Bot className="w-4 h-4 text-primary" />
                                </div>
                            )}
                            <Card
                                className={`max-w-[80%] shadow-sm ${msg.role === "user"
                                    ? "bg-blue-50 border-blue-100"
                                    : "bg-white border-slate-200"
                                    }`}
                            >
                                <CardContent className="p-3">
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                        {msg.content}
                                    </p>
                                </CardContent>
                            </Card>
                            {msg.role === "user" && (
                                <div className="w-8 h-8 rounded-lg bg-chart-2/10 flex items-center justify-center shrink-0 mt-1">
                                    <User className="w-4 h-4 text-chart-2" />
                                </div>
                            )}
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4 text-primary" />
                            </div>
                            <Card className="bg-white border-slate-200 shadow-sm">
                                <CardContent className="p-3">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                        <span className="text-sm text-muted-foreground">
                                            Analyzing your response...
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-slate-200 bg-white px-6 py-4 shrink-0">
                <div className="max-w-3xl mx-auto flex gap-3">
                    <Textarea
                        placeholder="Type your answer here... (Enter to send, Shift+Enter for new line)"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="min-h-[44px] max-h-[120px] bg-slate-50 border-slate-300 focus:border-blue-500 resize-none"
                        rows={1}
                    />
                    <Button
                        size="icon"
                        className="h-11 w-11 shrink-0 glow-primary"
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
