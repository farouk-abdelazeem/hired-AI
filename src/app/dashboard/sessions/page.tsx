"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Mic,
    Radio,
    Plus,
    Building2,
    Calendar,
    ArrowRight,
} from "lucide-react";

interface Session {
    id: string;
    companyName: string;
    role: string;
    type: "practice" | "live";
    createdAt: number;
    status: string;
}

export default function SessionsPage() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const loadSessions = async () => {
            const snap = await getDocs(
                query(
                    collection(db, "users", user.uid, "sessions"),
                    orderBy("createdAt", "desc")
                )
            );
            const items: Session[] = [];
            snap.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() } as Session);
            });
            setSessions(items);
            setLoading(false);
        };
        loadSessions();
    }, [user]);

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Interview Sessions
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Create and manage your practice and live interview sessions.
                    </p>
                </div>
                <Link href="/dashboard/sessions/new">
                    <Button className="glow-primary">
                        <Plus className="w-4 h-4 mr-2" />
                        New Session
                    </Button>
                </Link>
            </div>

            {/* Sessions List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <p className="text-muted-foreground text-sm">Loading sessions...</p>
                </div>
            ) : sessions.length === 0 ? (
                <Card className="border-slate-200 bg-slate-50/50 border-dashed shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <Mic className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1">No sessions yet</h3>
                        <p className="text-muted-foreground text-sm text-center max-w-sm mb-6">
                            Create your first interview session to start preparing with
                            AI-powered coaching.
                        </p>
                        <Link href="/dashboard/sessions/new">
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Create First Session
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {sessions.map((session) => (
                        <Link
                            key={session.id}
                            href={`/dashboard/sessions/${session.id}/${session.type}`}
                            className="block group"
                        >
                            <Card className="border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-all duration-200 hover:border-blue-300 hover:shadow-md">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center ${session.type === "live"
                                                    ? "bg-destructive/10"
                                                    : "bg-chart-3/10"
                                                    }`}
                                            >
                                                {session.type === "live" ? (
                                                    <Radio className="w-5 h-5 text-destructive" />
                                                ) : (
                                                    <Mic className="w-5 h-5 text-chart-3" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-medium">
                                                        {session.role}
                                                    </h3>
                                                    <Badge
                                                        variant={
                                                            session.type === "live"
                                                                ? "destructive"
                                                                : "secondary"
                                                        }
                                                        className="text-[10px]"
                                                    >
                                                        {session.type === "live" ? "LIVE" : "Practice"}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Building2 className="w-3 h-3" />
                                                        {session.companyName}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(session.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
