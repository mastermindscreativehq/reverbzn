"use client";

import { Bell, Terminal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onTerminalOpen?: () => void;
}

export function Header({ title, subtitle, onTerminalOpen }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-white/5"
          onClick={onTerminalOpen}
          title="Open Terminal (⌘K)"
        >
          <Terminal className="w-4 h-4" />
        </Button>
        <Link href="/notifications">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-white/5 relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan" />
          </Button>
        </Link>
      </div>
    </header>
  );
}
