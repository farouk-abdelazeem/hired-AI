"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Mail, Lock, Chrome } from "lucide-react";

export default function LoginPage() {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleEmailAuth = async (mode: "login" | "signup") => {
        setError("");
        setIsLoading(true);
        try {
            if (mode === "login") {
                await signInWithEmail(email, password);
            } else {
                await signUpWithEmail(email, password);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setError("");
        setIsLoading(true);
        try {
            await signInWithGoogle();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Background gradient orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-400/20 blur-[100px]" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-orange-400/20 blur-[100px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-300/10 blur-[120px]" />
            </div>

            <div className="page-enter w-full max-w-md mx-4">
                {/* Logo/Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 glow-primary mb-4">
                        <Sparkles className="w-7 h-7 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                        Hired
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Your AI-powered interview companion
                    </p>
                </div>

                <Card className="glass-strong border-slate-200/60 shadow-xl relative z-10">
                    <CardHeader className="text-center pb-4">
                        <CardTitle className="text-lg">Welcome</CardTitle>
                        <CardDescription>
                            Sign in to access your interview dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Google Auth */}
                        <Button
                            variant="outline"
                            className="w-full mb-6 h-11 gap-2 bg-secondary/50 hover:bg-secondary border-border/50"
                            onClick={handleGoogleAuth}
                            disabled={isLoading}
                        >
                            <Chrome className="w-4 h-4" />
                            Continue with Google
                        </Button>

                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border/50" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">
                                    or continue with email
                                </span>
                            </div>
                        </div>

                        {/* Email Auth Tabs */}
                        <Tabs defaultValue="login" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="login">Sign In</TabsTrigger>
                                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                            </TabsList>

                            <TabsContent value="login">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="login-email">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="login-email"
                                                type="email"
                                                placeholder="you@example.com"
                                                className="pl-10"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="login-password">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="login-password"
                                                type="password"
                                                placeholder="••••••••"
                                                className="pl-10"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full h-11 glow-primary"
                                        onClick={() => handleEmailAuth("login")}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? "Signing in..." : "Sign In"}
                                    </Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="signup">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="signup-email">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="signup-email"
                                                type="email"
                                                placeholder="you@example.com"
                                                className="pl-10"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="signup-password">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="signup-password"
                                                type="password"
                                                placeholder="••••••••"
                                                className="pl-10"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full h-11 glow-primary"
                                        onClick={() => handleEmailAuth("signup")}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? "Creating account..." : "Create Account"}
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {error && (
                            <p className="text-destructive text-sm mt-4 text-center">
                                {error}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
