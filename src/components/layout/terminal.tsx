"use client";

import { useState, useRef, useEffect } from "react";
import { X, Terminal as TerminalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  dashboardMetrics,
  tracks,
  fans,
  insights,
  automations,
  campaigns,
  regionSummaries,
} from "@/lib/data/seed";

interface TerminalLine {
  type: "input" | "output" | "error" | "system";
  content: string;
}

function processCommand(cmd: string): string {
  const c = cmd.trim().toLowerCase();

  if (c === "help") {
    return `REVERBZN OS Terminal — Available Commands:
  help        Show this help
  status      System status overview
  insights    Active insights and alerts
  momentum    Momentum score breakdown
  fans        Fan CRM summary
  tracks      Track performance table
  campaigns   Campaign history
  regions     Top regions breakdown
  autopilot   Automation status
  strategy    AI-generated strategic note
  clear       Clear terminal`;
  }

  if (c === "status") {
    return `SYSTEM STATUS — ${new Date().toLocaleString()}
  ─────────────────────────────────────
  Total Streams    ${dashboardMetrics.totalStreams.toLocaleString()}  (+${dashboardMetrics.totalStreamsGrowthPct}% WoW)
  Est. Earnings    $${dashboardMetrics.estimatedEarningsUsd.toLocaleString()}
  Owned Audience   ${dashboardMetrics.ownedAudienceCount} fans
  Momentum Score   ${dashboardMetrics.momentumScore}/100
  Top Platform     ${dashboardMetrics.topPlatform}
  Top Track        ${dashboardMetrics.topTrack}
  Top Region       ${dashboardMetrics.topRegion}
  Fan Growth/Week  +${dashboardMetrics.fanGrowthThisWeek}
  Status           ● NOMINAL`;
  }

  if (c === "momentum") {
    return `MOMENTUM SCORE: ${dashboardMetrics.momentumScore}/100
  ─────────────────────────────────────
  Stream Velocity   ████████░░  82
  Save Rate         ██████████  91
  Fan Retention     ████████░░  79
  Engagement Trend  ████████░░  85
  Release Cadence   ███████░░░  74
  ─────────────────────────────────────
  Signal Lost currently driving the score up.
  Risk: No new release in 30+ days.`;
  }

  if (c === "insights") {
    const unread = insights.filter(i => !i.isRead && !i.isDismissed);
    return `ACTIVE INSIGHTS (${unread.length} unread)
  ─────────────────────────────────────
${unread.map(i => `  [${i.priority.toUpperCase()}] ${i.title}`).join("\n")}
  ─────────────────────────────────────
  Run: insights view <id> for details`;
  }

  if (c === "fans") {
    return `FAN CRM SUMMARY
  ─────────────────────────────────────
  Total Fans       ${fans.length}
  Avg Engagement   ${Math.round(fans.reduce((a, f) => a + f.engagementScore, 0) / fans.length)}/100
  Avg Superfan     ${Math.round(fans.reduce((a, f) => a + f.superfanScore, 0) / fans.length)}/100
  On Email         ${fans.filter(f => f.channels.includes("email")).length}
  On Telegram      ${fans.filter(f => f.channels.includes("telegram")).length}
  Countries        ${[...new Set(fans.map(f => f.country))].length}
  Top Country      Nigeria (${fans.filter(f => f.country === "Nigeria").length} fans)`;
  }

  if (c === "tracks") {
    const sorted = [...tracks].sort((a, b) => b.totalPlays - a.totalPlays);
    return `TRACK PERFORMANCE
  ─────────────────────────────────────
${sorted.map((t, i) =>
  `  ${i + 1}. ${t.title.padEnd(20)} ${t.totalPlays.toLocaleString().padStart(8)} plays  Score: ${t.momentumScore}`
).join("\n")}`;
  }

  if (c === "campaigns") {
    return `CAMPAIGN HISTORY
  ─────────────────────────────────────
${campaigns.map(c =>
  `  ${c.status.toUpperCase().padEnd(10)} ${c.name.substring(0, 30).padEnd(30)} Open: ${c.openRate}%`
).join("\n")}`;
  }

  if (c === "regions") {
    return `TOP REGIONS
  ─────────────────────────────────────
${regionSummaries.slice(0, 6).map((r, i) =>
  `  ${i + 1}. ${r.flag} ${r.country.padEnd(18)} ${r.totalPlays.toLocaleString().padStart(10)} plays  +${r.weeklyGrowthPct}% WoW`
).join("\n")}`;
  }

  if (c === "autopilot") {
    return `AUTOPILOT STATUS
  ─────────────────────────────────────
${automations.map(a =>
  `  ${a.isEnabled ? "●" : "○"} ${a.name.padEnd(30)} ${a.status.toUpperCase().padEnd(8)} Runs: ${a.runCount}`
).join("\n")}`;
  }

  if (c === "strategy") {
    return `STRATEGIC NOTE — ${new Date().toLocaleDateString()}
  ─────────────────────────────────────
  Priority 1: Kenya is breaking. Signal Lost growing 142% WoW in
  Nairobi. Run city activation campaign immediately.

  Priority 2: Signal Lost is tracking 2.3x faster than any
  previous release. Push it harder NOW before algorithm window
  closes. Week 2-4 is critical.

  Priority 3: Reverb Season & Digital Love going cold. Create a
  catalog smart link and pitch both to editorial playlists.

  Priority 4: Audiomack RPM gap vs Spotify is widening. Shift
  20% of Nigeria promo toward Spotify playlist discovery.

  Momentum: STRONG. Consistent with your best 30-day period.`;
  }

  if (c === "clear") {
    return "__CLEAR__";
  }

  return `Command not recognized: "${cmd}". Type "help" for available commands.`;
}

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TerminalPanel({ isOpen, onClose }: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: "system", content: "REVERBZN OS Terminal v1.0 — Type 'help' to start" },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input.trim();
    const output = processCommand(cmd);

    if (output === "__CLEAR__") {
      setLines([{ type: "system", content: "Terminal cleared." }]);
    } else {
      setLines(prev => [
        ...prev,
        { type: "input", content: `> ${cmd}` },
        { type: "output", content: output },
      ]);
    }

    setHistory(prev => [cmd, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(newIndex);
      setInput(history[newIndex] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      setInput(newIndex === -1 ? "" : history[newIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl border border-cyan/20 bg-background/95 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-cyan" />
            <span className="text-sm font-mono text-cyan">REVERBZN OS Terminal</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Output */}
        <div className="h-80 overflow-y-auto scrollbar-thin p-4 font-mono text-sm space-y-1">
          {lines.map((line, i) => (
            <div
              key={i}
              className={cn(
                "whitespace-pre-wrap leading-relaxed",
                line.type === "input" && "text-cyan",
                line.type === "output" && "text-muted-foreground",
                line.type === "system" && "text-violet",
                line.type === "error" && "text-destructive",
              )}
            >
              {line.content}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-border/50">
          <span className="text-cyan font-mono text-sm shrink-0">{">"}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
            placeholder="type a command..."
            autoComplete="off"
            spellCheck={false}
          />
        </form>
      </div>
    </div>
  );
}
