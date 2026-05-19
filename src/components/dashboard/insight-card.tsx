"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ChevronDown, ChevronRight, AlertTriangle, Zap, TrendingUp,
  DollarSign, Users, FileText, ExternalLink, Play, Check, X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Insight } from "@/lib/db/schema";
import Link from "next/link";

const typeConfig = {
  alert:       { icon: AlertTriangle, color: "text-destructive",      bg: "bg-destructive/10", border: "border-destructive/20",  label: "ALERT" },
  opportunity: { icon: Zap,           color: "text-cyan",             bg: "bg-cyan/10",        border: "border-cyan/20",         label: "OPPORTUNITY" },
  pattern:     { icon: TrendingUp,    color: "text-violet",           bg: "bg-violet/10",      border: "border-violet/20",       label: "PATTERN" },
  money:       { icon: DollarSign,    color: "text-amber",            bg: "bg-amber/10",       border: "border-amber/20",        label: "MONEY" },
  fan:         { icon: Users,         color: "text-emerald",          bg: "bg-emerald/10",     border: "border-emerald/20",      label: "FAN" },
  content:     { icon: FileText,      color: "text-muted-foreground", bg: "bg-white/5",        border: "border-border",          label: "CONTENT" },
};

const priorityDot = {
  critical: "bg-destructive",
  high:     "bg-amber",
  medium:   "bg-cyan",
  low:      "bg-muted-foreground",
};

type ActionState = "idle" | "loading" | "success" | "error";

interface InsightCardProps {
  insight: Insight;
}

export function InsightCard({ insight }: InsightCardProps) {
  const router = useRouter();
  const [expanded, setExpanded]       = useState(false);
  const [execState, setExecState]     = useState<ActionState>("idle");
  const [readState, setReadState]     = useState<ActionState>("idle");
  const [dismissState, setDismissState] = useState<ActionState>("idle");

  const config = typeConfig[insight.type];
  const Icon = config.icon;

  async function handleExecute() {
    setExecState("loading");
    try {
      const res = await fetch("/api/actions/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insightId: insight.id, actionType: insight.actionLabel ?? "default" }),
      });
      setExecState(res.ok ? "success" : "error");
      if (res.ok) router.refresh();
    } catch {
      setExecState("error");
    }
  }

  async function handleMarkRead() {
    setReadState("loading");
    try {
      const res = await fetch(`/api/insights/${insight.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      setReadState(res.ok ? "success" : "error");
      if (res.ok) router.refresh();
    } catch {
      setReadState("error");
    }
  }

  async function handleDismiss() {
    setDismissState("loading");
    try {
      const res = await fetch(`/api/insights/${insight.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDismissed: true }),
      });
      setDismissState(res.ok ? "success" : "error");
      if (res.ok) router.refresh();
    } catch {
      setDismissState("error");
    }
  }

  if (insight.isDismissed) return null;

  return (
    <div className={cn(
      "rounded-lg border bg-card transition-all duration-200",
      config.border,
      !insight.isRead && "ring-1 ring-inset ring-white/5"
    )}>
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn("p-1.5 rounded-md shrink-0 mt-0.5", config.bg)}>
          <Icon className={cn("w-4 h-4", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-mono font-semibold tracking-wider", config.color)}>
              {config.label}
            </span>
            <div className={cn("w-1.5 h-1.5 rounded-full", priorityDot[insight.priority])} />
            <span className="text-[10px] font-mono text-muted-foreground uppercase">{insight.priority}</span>
            {!insight.isRead && (
              <div className="w-1.5 h-1.5 rounded-full bg-cyan ml-auto shrink-0" />
            )}
          </div>
          <p className="text-sm font-semibold text-foreground leading-tight">{insight.title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.message}</p>
        </div>
        <button className="text-muted-foreground shrink-0 mt-0.5" onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}>
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3">
          {insight.explanation && (
            <p className="text-xs text-muted-foreground leading-relaxed">{insight.explanation}</p>
          )}
          {insight.recommendedAction && (
            <div className="p-3 rounded-md bg-white/3 border border-border/50">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Recommended Action</p>
              <p className="text-xs text-foreground leading-relaxed">{insight.recommendedAction}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Execute */}
            {insight.recommendedAction && (
              <Button
                size="sm"
                disabled={execState === "loading" || execState === "success"}
                onClick={handleExecute}
                className={cn(
                  "gap-1.5 h-7 text-xs border",
                  execState === "success" && "bg-emerald/10 text-emerald border-emerald/20",
                  execState === "error"   && "bg-destructive/10 text-destructive border-destructive/20",
                  execState === "idle" || execState === "loading"
                    ? "bg-cyan/10 text-cyan border-cyan/20 hover:bg-cyan/20"
                    : "",
                )}
              >
                {execState === "loading" ? <Loader2 className="w-3 h-3 animate-spin" />
                  : execState === "success" ? <Check className="w-3 h-3" />
                  : execState === "error"   ? <X className="w-3 h-3" />
                  : <Play className="w-3 h-3" />}
                {execState === "success" ? "Executed" : execState === "error" ? "Failed" : "Execute"}
              </Button>
            )}

            {/* External link */}
            {insight.actionLabel && insight.actionUrl && (
              <Link href={insight.actionUrl}>
                <Button size="sm" className="gap-1.5 h-7 text-xs bg-violet/10 text-violet border border-violet/20 hover:bg-violet/20">
                  <ExternalLink className="w-3 h-3" />
                  {insight.actionLabel}
                </Button>
              </Link>
            )}

            {/* Mark as read */}
            {!insight.isRead && (
              <Button
                size="sm"
                variant="ghost"
                disabled={readState === "loading" || readState === "success"}
                onClick={handleMarkRead}
                className="gap-1.5 h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                {readState === "loading" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Mark read
              </Button>
            )}

            {/* Dismiss */}
            <Button
              size="sm"
              variant="ghost"
              disabled={dismissState === "loading"}
              onClick={handleDismiss}
              className="gap-1.5 h-7 text-xs text-muted-foreground hover:text-destructive ml-auto"
            >
              {dismissState === "loading" ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
