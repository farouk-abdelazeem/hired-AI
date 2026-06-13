"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import {
    doc,
    getDoc,
    setDoc,
    collection,
    getDocs,
    addDoc,
    deleteDoc,
} from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Brain,
    Plus,
    Save,
    FileText,
    Trash2,
    CheckCircle,
    User,
    Briefcase,
    GraduationCap,
    Sparkles,
} from "lucide-react";

interface KnowledgeEntry {
    id: string;
    title: string;
    content: string;
    category: string;
    createdAt: number;
}

const categories = [
    { value: "resume", label: "Resume / CV", icon: FileText },
    { value: "experience", label: "Work Experience", icon: Briefcase },
    { value: "education", label: "Education", icon: GraduationCap },
    { value: "skills", label: "Skills & Strengths", icon: User },
    { value: "other", label: "Other", icon: Brain },
];

export default function KnowledgePage() {
    const { user } = useAuth();
    const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
    const [bio, setBio] = useState("");
    const [agentSkill, setAgentSkill] = useState("");
    const [newTitle, setNewTitle] = useState("");
    const [newContent, setNewContent] = useState("");
    const [newCategory, setNewCategory] = useState("resume");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [skillSaved, setSkillSaved] = useState(false);

    // Load knowledge entries
    useEffect(() => {
        if (!user) return;
        const loadData = async () => {
            // Load bio
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                setBio(userData.bio || "");
                setAgentSkill(userData.agentSkill || "");
            }
            // Load knowledge entries
            const knowledgeSnap = await getDocs(
                collection(db, "users", user.uid, "knowledge")
            );
            const items: KnowledgeEntry[] = [];
            knowledgeSnap.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() } as KnowledgeEntry);
            });
            items.sort((a, b) => b.createdAt - a.createdAt);
            setEntries(items);
        };
        loadData();
    }, [user]);

    const saveBio = async () => {
        if (!user) return;
        setSaving(true);
        await setDoc(doc(db, "users", user.uid), { bio }, { merge: true });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const saveAgentSkill = async () => {
        if (!user) return;
        setSaving(true);
        await setDoc(
            doc(db, "users", user.uid),
            { agentSkill },
            { merge: true }
        );
        setSaving(false);
        setSkillSaved(true);
        setTimeout(() => setSkillSaved(false), 2000);
    };

    const addEntry = async () => {
        if (!user || !newTitle.trim() || !newContent.trim()) return;
        setSaving(true);
        const docRef = await addDoc(
            collection(db, "users", user.uid, "knowledge"),
            {
                title: newTitle,
                content: newContent,
                category: newCategory,
                createdAt: Date.now(),
            }
        );
        setEntries([
            {
                id: docRef.id,
                title: newTitle,
                content: newContent,
                category: newCategory,
                createdAt: Date.now(),
            },
            ...entries,
        ]);
        setNewTitle("");
        setNewContent("");
        setSaving(false);
    };

    const deleteEntry = async (id: string) => {
        if (!user) return;
        await deleteDoc(doc(db, "users", user.uid, "knowledge", id));
        setEntries(entries.filter((e) => e.id !== id));
    };

    const getCategoryInfo = (value: string) =>
        categories.find((c) => c.value === value) || categories[4];

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-chart-2/10 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-chart-2" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Knowledge Base
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Feed the AI everything about you — the more you provide, the
                            better it coaches you.
                        </p>
                    </div>
                </div>
            </div>

            {/* Bio Section */}
            <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        Professional Summary
                    </CardTitle>
                    <CardDescription>
                        A brief summary of who you are professionally. This helps the AI
                        understand your persona.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="e.g. I am a Senior Software Engineer with 8+ years of experience specializing in distributed systems and cloud architecture. I have led teams of up to 12 engineers..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="min-h-[120px] bg-slate-50 border-slate-200"
                    />
                    <div className="flex items-center gap-3">
                        <Button onClick={saveBio} disabled={saving} size="sm">
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? "Saving..." : "Save Summary"}
                        </Button>
                        {saved && (
                            <span className="text-sm text-chart-2 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" /> Saved
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Agent Skill Section */}
            <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Agent Skill
                    </CardTitle>
                    <CardDescription>
                        Tone, structure, constraints, and answer style the AI should follow.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="e.g. Be concise and executive. Answer in first person, use confident language, prefer STAR structure, avoid buzzwords, and include metrics whenever possible."
                        value={agentSkill}
                        onChange={(e) => setAgentSkill(e.target.value)}
                        className="min-h-[140px] bg-slate-50 border-slate-200"
                    />
                    <div className="flex items-center gap-3">
                        <Button onClick={saveAgentSkill} disabled={saving} size="sm">
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? "Saving..." : "Save Agent Skill"}
                        </Button>
                        {skillSaved && (
                            <span className="text-sm text-chart-2 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" /> Saved
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Add New Entry */}
            <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Plus className="w-4 h-4 text-primary" />
                        Add Knowledge Entry
                    </CardTitle>
                    <CardDescription>
                        Add your resume, work experience, education, skills, or any other
                        relevant information.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                placeholder="e.g. Software Engineer at Google"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="bg-slate-50 border-slate-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <select
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm"
                            >
                                {categories.map((cat) => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Content</Label>
                        <Textarea
                            placeholder="Paste your resume text, describe your experience, list your skills..."
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            className="min-h-[160px] bg-slate-50 border-slate-200"
                        />
                    </div>
                    <Button onClick={addEntry} disabled={saving || !newTitle.trim() || !newContent.trim()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Entry
                    </Button>
                </CardContent>
            </Card>

            {/* Existing Entries */}
            {entries.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">
                        Your Knowledge ({entries.length} entries)
                    </h2>
                    <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-3">
                            {entries.map((entry) => {
                                const cat = getCategoryInfo(entry.category);
                                const IconComp = cat.icon;
                                return (
                                    <Card
                                        key={entry.id}
                                        className="border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-colors"
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                                        <IconComp className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="text-sm font-medium truncate">
                                                                {entry.title}
                                                            </h3>
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-[10px] shrink-0"
                                                            >
                                                                {cat.label}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                                            {entry.content}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-7 h-7 text-muted-foreground hover:text-destructive shrink-0"
                                                    onClick={() => deleteEntry(entry.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </div>
    );
}
