"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActionState = "idle" | "loading" | "success" | "error";

interface Props {
  fanId:     string;
  action:    "invite_telegram" | "send_reengagement" | "send_release_alert";
  label:     string;
  className?: string;
}

export function FanActionButton({ fanId, action, label, className }: Props) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>("idle");

  async function handleClick() {
    setState("loading");
    try {
      const res = await fetch(`/api/fans/${fanId}/actions`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action }),
      });
      setState(res.ok ? "success" : "error");
      if (res.ok) router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <Button
      size="sm"
      disabled={state === "loading" || state === "success"}
      onClick={handleClick}
      className={cn(
        "gap-1 h-6 text-[10px] border font-mono",
        state === "success" && "bg-emerald/10 text-emerald border-emerald/20",
        state === "error"   && "bg-destructive/10 text-destructive border-destructive/20",
        (state === "idle" || state === "loading") && "bg-white/5 text-muted-foreground border-white/10 hover:text-foreground",
        className,
      )}
    >
      {state === "loading" ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
        : state === "success" ? <Check className="w-2.5 h-2.5" />
        : state === "error"   ? <X className="w-2.5 h-2.5" />
        : null}
      {state === "success" ? "Sent" : state === "error" ? "Failed" : label}
    </Button>
  );
}
