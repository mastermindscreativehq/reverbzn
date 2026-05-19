export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { getCampaignById } from "@/lib/db/queries";
import { ArrowLeft, Mail, MessageCircle, Megaphone, Zap, AlertTriangle, TrendingUp, DollarSign, Users, FileText } from "lucide-react";
import Link from "next/link";
import type { Campaign, Insight } from "@/lib/db/schema";

interface Props { params: Promise<{ id: string }> }

const statusColors: Record<Campaign["status"], string> = {
  draft:     "bg-white/5 text-muted-foreground border-white/10",
  active:    "bg-cyan/10 text-cyan border-cyan/20",
  paused:    "bg-amber/10 text-amber border-amber/20",
  completed: "bg-emerald/10 text-emerald border-emerald/20",
  failed:    "bg-destructive/10 text-destructive border-destructive/20",
};

const templateLabels: Record<Campaign["template"], string> = {
  new_release:           "New Release",
  breakout_push:         "Breakout Push",
  dormant_reactivation:  "Dormant Reactivation",
  city_activation:       "City Activation",
  exclusive_drop:        "Exclusive Drop",
};

const insightTypeConfig: Record<Insight["type"], { icon: React.ElementType; color: string; label: string }> = {
  alert:       { icon: AlertTriangle, color: "text-destructive", label: "Alert" },
  opportunity: { icon: Zap,           color: "text-cyan",        label: "Opportunity" },
  pattern:     { icon: TrendingUp,    color: "text-violet",      label: "Pattern" },
  money:       { icon: DollarSign,    color: "text-amber",       label: "Money" },
  fan:         { icon: Users,         color: "text-emerald",     label: "Fan" },
  content:     { icon: FileText,      color: "text-muted-foreground", label: "Content" },
};

const priorityColors: Record<Insight["priority"], string> = {
  critical: "text-destructive",
  high:     "text-amber",
  medium:   "text-cyan",
  low:      "text-muted-foreground",
};

function ChannelIcon({ channel }: { channel: Campaign["channel"] }) {
  if (channel === "email")    return <Mail className="w-3.5 h-3.5 text-cyan" />;
  if (channel === "telegram") return <MessageCircle className="w-3.5 h-3.5 text-violet" />;
  if (channel === "whatsapp") return <MessageCircle className="w-3.5 h-3.5 text-emerald" />;
  return <Megaphone className="w-3.5 h-3.5 text-muted-foreground" />;
}

export default async function CampaignDetailPage({ params }: Props) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  const { insight, execution } = campaign;
  const openRate  = parseFloat(String(campaign.openRate));
  const clickRate = parseFloat(String(campaign.clickRate));
  const convRate  = parseFloat(String(campaign.conversionRate));

  return (
    <div className="flex flex-col">
      <Header title={campaign.name} subtitle="Campaign detail" />
      <div className="p-6 space-y-6">

        <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> All Campaigns
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Left: Campaign details */}
          <div className="space-y-4">

            {/* Status + meta */}
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <Badge className={`text-[10px] font-mono uppercase ${statusColors[campaign.status]}`}>
                  {campaign.status}
                </Badge>
                <Badge className="text-[10px] bg-white/5 text-muted-foreground border-white/10">
                  {templateLabels[campaign.template]}
                </Badge>
                <div className="flex items-center gap-1">
                  <ChannelIcon channel={campaign.channel} />
                  <span className="text-[10px] font-mono text-muted-foreground capitalize">{campaign.channel}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Created</p>
                  <p className="text-xs text-foreground">{new Date(campaign.createdAt).toLocaleString()}</p>
                </div>
                {campaign.sentAt && (
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Sent</p>
                    <p className="text-xs text-foreground">{new Date(campaign.sentAt).toLocaleString()}</p>
                  </div>
                )}
                {campaign.segment && (
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Target Segment</p>
                    <p className="text-xs text-foreground">{campaign.segment.name}</p>
                    {campaign.segment.description && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{campaign.segment.description}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Message */}
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <h3 className="text-xs font-mono uppercase text-muted-foreground mb-2">Message</h3>
              <p className="text-xs text-foreground leading-relaxed">{campaign.message}</p>
            </div>

            {/* Performance (if completed) */}
            {campaign.status === "completed" && (
              <div className="rounded-xl border border-border/50 bg-card p-4">
                <h3 className="text-xs font-mono uppercase text-muted-foreground mb-3">Performance</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Recipients", value: campaign.recipientCount, color: "text-foreground",    pct: null },
                    { label: "Opens",      value: campaign.openCount,      color: "text-cyan",          pct: openRate },
                    { label: "Clicks",     value: campaign.clickCount,     color: "text-violet",        pct: clickRate },
                    { label: "Converted",  value: campaign.conversionCount, color: "text-emerald",      pct: convRate },
                  ].map(m => (
                    <div key={m.label}>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase mb-0.5">{m.label}</p>
                      <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                      {m.pct !== null && (
                        <p className="text-[10px] font-mono text-muted-foreground">{m.pct.toFixed(1)}%</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Source insight + execution log */}
          <div className="lg:col-span-2 space-y-4">

            {/* Source insight */}
            {insight ? (() => {
              const cfg = insightTypeConfig[insight.type];
              const Icon = cfg.icon;
              return (
                <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/50">
                    <h2 className="text-sm font-semibold text-foreground">Source Insight</h2>
                    <p className="text-xs text-muted-foreground font-mono">The insight that triggered this campaign</p>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded-md bg-white/5 shrink-0">
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`text-[10px] font-mono font-semibold tracking-wider uppercase ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <span className={`text-[10px] font-mono uppercase ${priorityColors[insight.priority]}`}>
                            {insight.priority}
                          </span>
                          <Badge className={`text-[10px] ${insight.isRead ? "bg-white/5 text-muted-foreground border-white/10" : "bg-cyan/10 text-cyan border-cyan/20"}`}>
                            {insight.isRead ? "Read" : "Unread"}
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold text-foreground mb-1">{insight.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{insight.message}</p>
                        {insight.recommendedAction && (
                          <div className="mt-3 p-3 rounded-md bg-white/3 border border-border/50">
                            <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Recommended Action</p>
                            <p className="text-xs text-foreground leading-relaxed">{insight.recommendedAction}</p>
                          </div>
                        )}
                        <p className="text-[10px] font-mono text-muted-foreground/60 mt-2">
                          Generated {new Date(insight.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="rounded-xl border border-border/50 bg-card p-5">
                <p className="text-sm text-muted-foreground">This campaign was not created from an insight.</p>
              </div>
            )}

            {/* Execution log */}
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50">
                <h2 className="text-sm font-semibold text-foreground">Execution Log</h2>
                <p className="text-xs text-muted-foreground font-mono">
                  {execution ? "Triggered by action execution" : "No execution recorded"}
                </p>
              </div>
              {execution ? (
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Status</p>
                      <Badge className={
                        execution.status === "success" ? "bg-emerald/10 text-emerald border-emerald/20" :
                        execution.status === "failed"  ? "bg-destructive/10 text-destructive border-destructive/20" :
                        "bg-amber/10 text-amber border-amber/20"
                      }>
                        {execution.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Action Type</p>
                      <p className="text-xs text-foreground font-mono">{execution.actionType}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Executed At</p>
                      <p className="text-xs text-foreground">{new Date(execution.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {execution.response != null && (
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">Webhook Response</p>
                      <pre className="text-[10px] font-mono text-muted-foreground bg-black/30 rounded-md p-3 overflow-x-auto leading-relaxed">
                        {JSON.stringify(execution.response as Record<string, unknown>, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">No execution record linked to this campaign.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
