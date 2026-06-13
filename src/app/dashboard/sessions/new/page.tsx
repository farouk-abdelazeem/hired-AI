"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, addDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Building2,
    Globe,
    Briefcase,
    FileText,
    Mic,
    Radio,
    ArrowLeft,
    Sparkles,
} from "lucide-react";

export default function NewSessionPage() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultType = searchParams.get("type") === "live" ? "live" : "practice";

    const [sessionType, setSessionType] = useState<"practice" | "live">(
        defaultType as "practice" | "live"
    );
    const [companyName, setCompanyName] = useState("");
    const [companyWebsite, setCompanyWebsite] = useState("");
    const [role, setRole] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
        if (!user || !companyName.trim() || !role.trim()) return;
        setCreating(true);

        try {
            const docRef = await addDoc(
                collection(db, "users", user.uid, "sessions"),
                {
                    companyName: companyName.trim(),
                    companyWebsite: companyWebsite.trim(),
                    role: role.trim(),
                    jobDescription: jobDescription.trim(),
                    type: sessionType,
                    status: "created",
                    createdAt: Date.now(),
                }
            );

            router.push(`/dashboard/sessions/${docRef.id}/${sessionType}`);
        } catch (err) {
            console.error("Error creating session:", err);
            setCreating(false);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
            {/* Back Button */}
            <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => router.back()}
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
            </Button>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    Create Interview Session
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Set up the context for your AI-powered interview coaching.
                </p>
            </div>

            {/* Session Type Toggle */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setSessionType("practice")}
                    className={`p-4 rounded-xl border transition-all duration-200 text-left ${sessionType === "practice"
                        ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-500/10"
                        : "border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                        }`}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center ${sessionType === "practice"
                                ? "bg-chart-3/20"
                                : "bg-muted"
                                }`}
                        >
                            <Mic
                                className={`w-4 h-4 ${sessionType === "practice"
                                    ? "text-chart-3"
                                    : "text-muted-foreground"
                                    }`}
                            />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Practice Session</p>
                            <p className="text-xs text-muted-foreground">
                                AI mock interview
                            </p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => setSessionType("live")}
                    className={`p-4 rounded-xl border transition-all duration-200 text-left ${sessionType === "live"
                        ? "border-orange-500 bg-orange-50 shadow-md shadow-orange-500/10"
                        : "border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                        }`}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center relative ${sessionType === "live"
                                ? "bg-destructive/20"
                                : "bg-muted"
                                }`}
                        >
                            <Radio
                                className={`w-4 h-4 ${sessionType === "live"
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                    }`}
                            />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Live Interview</p>
                            <p className="text-xs text-muted-foreground">
                                Real-time AI HUD
                            </p>
                        </div>
                    </div>
                </button>
            </div>

            {/* Session Form */}
            <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Interview Details
                    </CardTitle>
                    <CardDescription>
                        Provide details about the company and role so the AI can tailor its
                        coaching.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                Company Name *
                            </Label>
                            <Input
                                placeholder="e.g. Google"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="bg-slate-50 border-slate-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                                Company Website
                            </Label>
                            <Input
                                placeholder="e.g. https://google.com"
                                value={companyWebsite}
                                onChange={(e) => setCompanyWebsite(e.target.value)}
                                className="bg-slate-50 border-slate-200"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                            Role / Position *
                        </Label>
                        <Input
                            placeholder="e.g. Senior Software Engineer"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="bg-secondary/30 border-border/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                            Job Description
                        </Label>
                        <Textarea
                            placeholder="Paste the full job description here. The more detail you provide, the better the AI can tailor its questions and coaching..."
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            className="min-h-[180px] bg-slate-50 border-slate-200"
                        />
                    </div>

                    <Button
                        className="w-full h-11 glow-primary"
                        onClick={handleCreate}
                        disabled={creating || !companyName.trim() || !role.trim()}
                    >
                        {creating ? (
                            "Creating session..."
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Create{" "}
                                {sessionType === "live" ? "Live Interview" : "Practice"}{" "}
                                Session
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
