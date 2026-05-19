"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  accent?: "cyan" | "violet" | "emerald" | "amber" | "destructive";
  className?: string;
  sublabel?: string;
  delay?: number;
}

const accentMap = {
  cyan: {
    border: "border-cyan/20 hover:border-cyan/40",
    bg: "bg-cyan/5",
    icon: "text-cyan",
    glow: "hover:shadow-cyan/10",
  },
  violet: {
    border: "border-violet/20 hover:border-violet/40",
    bg: "bg-violet/5",
    icon: "text-violet",
    glow: "hover:shadow-violet/10",
  },
  emerald: {
    border: "border-emerald/20 hover:border-emerald/40",
    bg: "bg-emerald/5",
    icon: "text-emerald",
    glow: "hover:shadow-emerald/10",
  },
  amber: {
    border: "border-amber/20 hover:border-amber/40",
    bg: "bg-amber/5",
    icon: "text-amber",
    glow: "hover:shadow-amber/10",
  },
  destructive: {
    border: "border-destructive/20 hover:border-destructive/40",
    bg: "bg-destructive/5",
    icon: "text-destructive",
    glow: "hover:shadow-destructive/10",
  },
};

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  accent = "cyan",
  className,
  sublabel,
  delay = 0,
}: MetricCardProps) {
  const colors = accentMap[accent];
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "relative rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-lg",
        colors.border,
        colors.glow,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
          <p className="text-2xl font-bold text-foreground leading-none truncate">{value}</p>
          {sublabel && (
            <p className="text-xs text-muted-foreground mt-1.5 font-mono">{sublabel}</p>
          )}
        </div>
        {icon && (
          <div className={cn("p-2 rounded-lg shrink-0", colors.bg)}>
            <div className={cn("w-5 h-5", colors.icon)}>{icon}</div>
          </div>
        )}
      </div>

      {change !== undefined && (
        <div className="flex items-center gap-1.5 mt-3">
          {isPositive && <TrendingUp className="w-3.5 h-3.5 text-emerald" />}
          {isNegative && <TrendingDown className="w-3.5 h-3.5 text-destructive" />}
          {!isPositive && !isNegative && <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
          <span className={cn(
            "text-xs font-mono font-semibold",
            isPositive && "text-emerald",
            isNegative && "text-destructive",
            !isPositive && !isNegative && "text-muted-foreground"
          )}>
            {isPositive ? "+" : ""}{change}%
          </span>
          {changeLabel && (
            <span className="text-xs text-muted-foreground">{changeLabel}</span>
          )}
        </div>
      )}

      {/* Subtle accent line */}
      <div className={cn("absolute bottom-0 left-4 right-4 h-[1px] opacity-30", `bg-${accent}`)} />
    </motion.div>
  );
}
