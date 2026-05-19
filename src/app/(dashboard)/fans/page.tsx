export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import {
  getArtistBySlug, getFans, getFanSegments,
  getFansBySmartSegment, getSmartSegmentCounts,
  type SmartSegmentKey,
} from "@/lib/db/queries";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowUpRight, Mail, MessageCircle, Phone } from "lucide-react";
import { FanActionButton } from "@/components/dashboard/fan-action-button";

const ARTIST_SLUG = process.env.ARTIST_SLUG ?? "reverbzn";

const SMART_SEGMENTS: { key: SmartSegmentKey; label: string; color: string }[] = [
  { key: "high_engagement",  label: "High Engagement",  color: "text-emerald" },
  { key: "top_supporters",   label: "Top Supporters",   color: "text-amber" },
  { key: "dormant",          label: "Dormant",          color: "text-muted-foreground" },
  { key: "telegram_missing", label: "No Telegram",      color: "text-violet" },
  { key: "email_missing",    label: "No Email",         color: "text-cyan" },
];

function lifecycleStage(lastActiveAt: Date | string): "active" | "dormant" | "churned" {
  const days = Math.floor((Date.now() - new Date(lastActiveAt).getTime()) / 86400000);
  if (days <= 30) return "active";
  if (days <= 90) return "dormant";
  return "churned";
}

const LIFECYCLE_STYLE = {
  active:  "bg-emerald/10 text-emerald border-emerald/20",
  dormant: "bg-amber/10 text-amber border-amber/20",
  churned: "bg-white/5 text-muted-foreground border-white/10",
};

interface PageProps {
  searchParams: Promise<{ segment?: string }>;
}

export default async function FansPage({ searchParams }: PageProps) {
  const { segment: segmentParam } = await searchParams;
  const artist = await getArtistBySlug(ARTIST_SLUG);

  if (!artist) {
    return (
      <div className="flex flex-col">
        <Header title="Fan CRM" subtitle="No artist found" />
        <div className="p-6">
          <p className="text-sm text-muted-foreground font-mono">Run <code>npm run db:seed</code> first.</p>
        </div>
      </div>
    );
  }

  const validSmartSegments = new Set(SMART_SEGMENTS.map(s => s.key));
  const activeSmartSegment = validSmartSegments.has(segmentParam as SmartSegmentKey)
    ? segmentParam as SmartSegmentKey
    : null;

  const [allFans, segments, smartCounts] = await Promise.all([
    activeSmartSegment
      ? getFansBySmartSegment(artist.id, activeSmartSegment)
      : getFans(artist.id),
    getFanSegments(artist.id),
    getSmartSegmentCounts(artist.id),
  ]);

  const fans = [...allFans].sort((a, b) =>
    activeSmartSegment === "dormant"
      ? new Date(a.lastActiveAt).getTime() - new Date(b.lastActiveAt).getTime()
      : b.superfanScore - a.superfanScore
  );

  const countries     = [...new Set(allFans.map(f => f.country).filter(Boolean))];
  const totalEmail    = allFans.filter(f => f.email).length;
  const totalTelegram = allFans.filter(f => f.telegramId).length;
  const superfans     = allFans.filter(f => f.superfanScore >= 80).length;

  const activeSegmentLabel = SMART_SEGMENTS.find(s => s.key === activeSmartSegment)?.label;

  return (
    <div className="flex flex-col">
      <Header
        title="Fan CRM"
        subtitle={
          activeSegmentLabel
            ? `${fans.length} fans in "${activeSegmentLabel}"`
            : `${allFans.length} owned fans across ${countries.length} countries`
        }
      />
      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Fans",  value: allFans.length, accent: "text-cyan" },
            { label: "On Email",    value: totalEmail,     accent: "text-violet" },
            { label: "On Telegram", value: totalTelegram,  accent: "text-emerald" },
            { label: "Superfans",   value: superfans,      accent: "text-amber" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border/50 bg-card p-4">
              <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.accent}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

          {/* Fan table */}
          <div className="lg:col-span-3 rounded-xl border border-border/50 bg-card overflow-hidden">
            {fans.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No fans in this segment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      {["Fan", "Country", "Channels", "Lifecycle", "Engagement", "Superfan", "Last Active", "Actions", ""].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fans.map(fan => {
                      const stage = lifecycleStage(fan.lastActiveAt);
                      const hasEmail    = Boolean(fan.email);
                      const hasTelegram = Boolean(fan.telegramId);
                      const hasWhatsapp = Boolean(fan.whatsappPhone);
                      const daysSince   = Math.floor((Date.now() - new Date(fan.lastActiveAt).getTime()) / 86400000);

                      return (
                        <tr key={fan.id} className="border-b border-border/20 hover:bg-white/2 transition-colors group">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan/30 to-violet/30 border border-white/5 flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                                {fan.displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                              </div>
                              <div>
                                <Link href={`/fans/${fan.id}`} className="text-sm font-medium text-foreground group-hover:text-cyan transition-colors flex items-center gap-1">
                                  {fan.displayName}
                                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                </Link>
                                {fan.email && <p className="text-[10px] text-muted-foreground font-mono">{fan.email}</p>}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {fan.city ? `${fan.city}, ` : ""}{fan.country ?? "—"}
                          </td>

                          {/* Owned-channel badges */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {hasEmail    && <Mail          className="w-3 h-3 text-cyan" />}
                              {hasTelegram && <MessageCircle className="w-3 h-3 text-violet" />}
                              {hasWhatsapp && <Phone         className="w-3 h-3 text-emerald" />}
                              {!hasEmail && !hasTelegram && !hasWhatsapp && (
                                <span className="text-[10px] text-muted-foreground/50">none</span>
                              )}
                            </div>
                          </td>

                          {/* Lifecycle */}
                          <td className="px-4 py-3">
                            <Badge className={`text-[10px] capitalize ${LIFECYCLE_STYLE[stage]}`}>
                              {stage}
                            </Badge>
                          </td>

                          <td className="px-4 py-3">
                            <span className={`text-sm font-mono font-semibold ${fan.engagementScore >= 80 ? "text-emerald" : fan.engagementScore >= 60 ? "text-cyan" : "text-muted-foreground"}`}>
                              {fan.engagementScore}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span className={`text-sm font-mono font-semibold ${fan.superfanScore >= 80 ? "text-emerald" : fan.superfanScore >= 60 ? "text-cyan" : "text-muted-foreground"}`}>
                              {fan.superfanScore}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                            {daysSince === 0 ? "Today" : daysSince === 1 ? "Yesterday" : `${daysSince}d ago`}
                          </td>

                          {/* Quick actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!hasTelegram && (
                                <FanActionButton fanId={fan.id} action="invite_telegram"   label="+ TG" />
                              )}
                              {stage === "dormant" || stage === "churned" ? (
                                <FanActionButton fanId={fan.id} action="send_reengagement" label="Re-engage" />
                              ) : (
                                <FanActionButton fanId={fan.id} action="send_release_alert" label="Alert" />
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <Link href={`/fans/${fan.id}`} className="text-xs text-muted-foreground hover:text-cyan font-mono">
                              View →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sidebar — smart segments + DB segments */}
          <div className="space-y-4">

            {/* Smart segments */}
            <div>
              <h3 className="text-xs font-mono uppercase text-muted-foreground mb-2">Smart Segments</h3>
              <div className="space-y-1.5">
                <Link
                  href="/fans"
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${!activeSmartSegment ? "border-cyan/30 bg-cyan/5" : "border-border/50 bg-card hover:border-white/20"}`}
                >
                  <span className="text-xs font-medium text-foreground">All Fans</span>
                  <Badge className="text-[10px] font-mono bg-white/5 text-muted-foreground border-white/10">{allFans.length}</Badge>
                </Link>
                {SMART_SEGMENTS.map(seg => (
                  <Link
                    key={seg.key}
                    href={`/fans?segment=${seg.key}`}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${activeSmartSegment === seg.key ? "border-cyan/30 bg-cyan/5" : "border-border/50 bg-card hover:border-white/20"}`}
                  >
                    <span className={`text-xs font-medium ${activeSmartSegment === seg.key ? "text-cyan" : "text-foreground"}`}>
                      {seg.label}
                    </span>
                    <Badge className={`text-[10px] font-mono bg-white/5 border-white/10 ${seg.color}`}>
                      {smartCounts[seg.key]}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>

            {/* DB-backed segments */}
            {segments.length > 0 && (
              <div>
                <h3 className="text-xs font-mono uppercase text-muted-foreground mb-2">Saved Segments</h3>
                <div className="space-y-1.5">
                  {segments.map(seg => (
                    <div key={seg.id} className="rounded-lg border border-border/50 bg-card p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-foreground">{seg.name}</p>
                        <Badge className="text-[10px] font-mono bg-cyan/10 text-cyan border-cyan/20">{seg.memberCount}</Badge>
                      </div>
                      {seg.description && (
                        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{seg.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
