"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
    LayoutDashboard,
    Brain,
    Mic,
    LogOut,
    Sparkles,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        label: "Knowledge",
        href: "/dashboard/knowledge",
        icon: Brain,
    },
    {
        label: "Sessions",
        href: "/dashboard/sessions",
        icon: Mic,
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user, signOut } = useAuth();
    const [collapsed, setCollapsed] = React.useState(false);

    const initials = user?.displayName
        ? user.displayName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
        : user?.email?.[0]?.toUpperCase() || "U";

    return (
        <aside
            className={cn(
                "h-screen flex flex-col border-r border-slate-200 bg-white/90 backdrop-blur-md transition-all duration-300 ease-in-out",
                collapsed ? "w-[72px]" : "w-[260px]"
            )}
        >
            {/* Brand */}
            <div className="flex items-center gap-3 px-4 h-16 shrink-0">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
                    <Sparkles className="w-5 h-5 text-primary" />
                </div>
                {!collapsed && (
                    <span className="text-lg font-bold tracking-tight">Hired</span>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "ml-auto w-7 h-7 text-muted-foreground hover:text-foreground",
                        collapsed && "ml-0"
                    )}
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <ChevronLeft className="w-4 h-4" />
                    )}
                </Button>
            </div>

            <Separator className="opacity-50" />

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => {
                    const isActive =
                        item.href === "/dashboard"
                            ? pathname === "/dashboard"
                            : pathname.startsWith(item.href);
                    return (
                        <Link key={item.href} href={item.href}>
                            <div
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50",
                                    collapsed && "justify-center px-2"
                                )}
                            >
                                <item.icon className="w-5 h-5 shrink-0" />
                                {!collapsed && <span>{item.label}</span>}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* User Section */}
            <div className="px-3 py-4 mt-auto">
                <Separator className="mb-4 opacity-50" />
                <div
                    className={cn(
                        "flex items-center gap-3",
                        collapsed && "justify-center"
                    )}
                >
                    <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                                {user?.displayName || "User"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {user?.email}
                            </p>
                        </div>
                    )}
                    {!collapsed && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-muted-foreground hover:text-destructive"
                            onClick={signOut}
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
        </aside>
    );
}
