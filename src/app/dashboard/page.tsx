"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Brain,
    Mic,
    Radio,
    ArrowRight,
    Sparkles,
    BookOpen,
    Target,
    Zap,
} from "lucide-react";

export default function DashboardPage() {
    const { user } = useAuth();
    const firstName = user?.displayName?.split(" ")[0] || "there";

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
            {/* Welcome Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Welcome back, {firstName}
                </h1>
                <p className="text-muted-foreground mt-1">
                    Your interview command center. Prepare, practice, and perform.
                </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Knowledge Base */}
                <Link href="/dashboard/knowledge" className="group">
                    <Card className="h-full border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-xl bg-chart-2/10 flex items-center justify-center">
                                    <Brain className="w-5 h-5 text-chart-2" />
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                            <CardTitle className="text-base mt-3">Knowledge Base</CardTitle>
                            <CardDescription>
                                Upload your resume, experiences, and documents so the AI understands your profile.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Badge variant="secondary" className="text-xs">
                                <BookOpen className="w-3 h-3 mr-1" />
                                Your Profile
                            </Badge>
                        </CardContent>
                    </Card>
                </Link>

                {/* Practice Session */}
                <Link href="/dashboard/sessions/new?type=practice" className="group">
                    <Card className="h-full border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-xl bg-chart-3/10 flex items-center justify-center">
                                    <Target className="w-5 h-5 text-chart-3" />
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                            <CardTitle className="text-base mt-3">Practice Session</CardTitle>
                            <CardDescription>
                                AI-powered mock interviews tailored to your target role. Get real-time feedback.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Badge variant="secondary" className="text-xs">
                                <Mic className="w-3 h-3 mr-1" />
                                Prepare
                            </Badge>
                        </CardContent>
                    </Card>
                </Link>

                {/* Live Interview */}
                <Link href="/dashboard/sessions/new?type=live" className="group">
                    <Card className="h-full border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center relative">
                                    <Radio className="w-5 h-5 text-destructive" />
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full pulse-ring" />
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                            <CardTitle className="text-base mt-3">Live Interview</CardTitle>
                            <CardDescription>
                                Real-time AI HUD during your actual interview. Low-latency answers powered by Gemini.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Badge variant="secondary" className="text-xs text-destructive">
                                <Zap className="w-3 h-3 mr-1" />
                                Real-time
                            </Badge>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Getting Started Tips */}
            <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <CardTitle className="text-base">Getting Started</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                                1
                            </div>
                            <div>
                                <p className="text-sm font-medium">Build your Knowledge Base</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Add your resume, skills, and past experiences.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                                2
                            </div>
                            <div>
                                <p className="text-sm font-medium">Create an Interview Session</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Add the company, role, and job description.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                                3
                            </div>
                            <div>
                                <p className="text-sm font-medium">Practice or Go Live</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Choose practice mode to prep, or live mode during the real interview.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
