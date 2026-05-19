export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { getArtistBySlug, getCampaigns } from "@/lib/db/queries";
import { Megaphone, Mail, MessageCircle, ArrowUpRight } from "lucide-react";
import type { Campaign } from "@/lib/db/schema";
import Link from "next/link";

const ARTIST_SLUG = process.env.ARTIST_SLUG ?? "reverbzn";

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

function ChannelIcon({ channel }: { channel: Campaign["channel"] }) {
  if (channel === "email")    return <Mail className="w-3.5 h-3.5 text-cyan" />;
  if (channel === "telegram") return <MessageCircle className="w-3.5 h-3.5 text-violet" />;
  if (channel === "whatsapp") return <MessageCircle className="w-3.5 h-3.5 text-emerald" />;
  return <Megaphone className="w-3.5 h-3.5 text-muted-foreground" />;
}

export default async function CampaignsPage() {
  const artist = await getArtistBySlug(ARTIST_SLUG);
  if (!artist) {
    return (
      <div className="flex flex-col">
        <Header title="Campaign Engine" subtitle="No artist found" />
        <div className="p-6">
          <p className="text-sm text-muted-foreground font-mono">Run <code>npm run db:seed</code> first.</p>
        </div>
      </div>
    );
  }

  const campaigns = await getCampaigns(artist.id);

  const completed = campaigns.filter(c => c.status === "completed");
  const avgOpen = completed.length
    ? (completed.reduce((a, c) => a + parseFloat(String(c.openRate)), 0) / completed.length).toFixed(1)
    : "0";
  const avgCvr = completed.length
    ? (completed.reduce((a, c) => a + parseFloat(String(c.conversionRate)), 0) / completed.length).toFixed(1)
    : "0";

  return (
    <div className="flex flex-col">
      <Header title="Campaign Engine" subtitle="Email, Telegram & WhatsApp campaigns" />
      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Campaigns", value: campaigns.length,  color: "text-cyan" },
            { label: "Completed",       value: completed.length,  color: "text-emerald" },
            { label: "Avg Open Rate",   value: `${avgOpen}%`,     color: "text-violet" },
            { label: "Avg Conv. Rate",  value: `${avgCvr}%`,      color: "text-amber" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border/50 bg-card p-4">
              <p className="text-[10px] font-mono uppercase text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Campaign list */}
        <div className="space-y-3">
          {campaigns.length === 0 ? (
            <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">No campaigns yet. Execute an insight action to create one.</p>
            </div>
          ) : campaigns.map(camp => {
            const openRate = parseFloat(String(camp.openRate));
            const clickRate = parseFloat(String(camp.clickRate));
            const convRate = parseFloat(String(camp.conversionRate));

            return (
              <div key={camp.id} className="rounded-xl border border-border/50 bg-card p-5 hover:border-white/20 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge className={`text-[10px] font-mono uppercase ${statusColors[camp.status]}`}>
                        {camp.status}
                      </Badge>
                      <Badge className="text-[10px] bg-white/5 text-muted-foreground border-white/10">
                        {templateLabels[camp.template]}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <ChannelIcon channel={camp.channel} />
                        <span className="text-[10px] font-mono text-muted-foreground capitalize">{camp.channel}</span>
                      </div>
                      {camp.insightId && (
                        <Badge className="text-[10px] bg-violet/10 text-violet border-violet/20">
                          From insight
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">{camp.name}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{camp.message}</p>
                    {camp.segment && (
                      <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                        Target: {camp.segment.name}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {camp.status === "completed" && (
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground uppercase mb-0.5">Sent</p>
                          <p className="text-base font-bold text-foreground">{camp.recipientCount}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground uppercase mb-0.5">Opens</p>
                          <p className="text-base font-bold text-cyan">{openRate.toFixed(0)}%</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground uppercase mb-0.5">CVR</p>
                          <p className="text-base font-bold text-emerald">{convRate.toFixed(0)}%</p>
                        </div>
                      </div>
                    )}
                    <Link
                      href={`/campaigns/${camp.id}`}
                      className="text-xs text-muted-foreground hover:text-cyan font-mono flex items-center gap-1"
                    >
                      View <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {camp.status === "completed" && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { label: "Recipients", value: camp.recipientCount, pct: null },
                        { label: "Opened",     value: camp.openCount,       pct: openRate },
                        { label: "Clicked",    value: camp.clickCount,      pct: clickRate },
                        { label: "Converted",  value: camp.conversionCount, pct: convRate },
                      ].map(m => (
                        <div key={m.label}>
                          <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">{m.label}</p>
                          <p className="text-sm font-semibold text-foreground">{m.value}</p>
                          {m.pct !== null && (
                            <div className="mt-1 w-full h-1 rounded-full bg-white/5">
                              <div className="h-full rounded-full bg-cyan" style={{ width: `${m.pct}%` }} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 mt-3">
                  <span className="text-[10px] font-mono text-muted-foreground/60">
                    Created {new Date(camp.createdAt).toLocaleDateString()}
                  </span>
                  {camp.sentAt && (
                    <span className="text-[10px] font-mono text-muted-foreground/60">
                      · Sent {new Date(camp.sentAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
