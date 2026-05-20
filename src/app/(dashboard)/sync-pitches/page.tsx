export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";
import { Film, DollarSign, Target, TrendingUp, Clock, CheckCircle2, XCircle, Zap } from "lucide-react";
import Link from "next/link";
import { getArtistBySlug, getSyncOpportunities, getSyncPitches, getInsights } from "@/lib/db/queries";

const statusConfig: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
  licensed:    { label: "Licensed",    class: "bg-emerald/10 text-emerald border-emerald/20",                    icon: <CheckCircle2 className="w-3 h-3" /> },
  shortlisted: { label: "Shortlisted", class: "bg-cyan/10 text-cyan border-cyan/20",                             icon: <Target className="w-3 h-3" /> },
  submitted:   { label: "Submitted",   class: "bg-violet/10 text-violet border-violet/20",                       icon: <Clock className="w-3 h-3" /> },
  rejected:    { label: "Rejected",    class: "bg-destructive/10 text-destructive border-destructive/20",         icon: <XCircle className="w-3 h-3" /> },
  expired:     { label: "Expired",     class: "bg-white/5 text-muted-foreground border-white/10",                icon: <Clock className="w-3 h-3" /> },
  draft:       { label: "Draft",       class: "bg-white/5 text-muted-foreground border-white/10",                icon: <Film className="w-3 h-3" /> },
};

const mediaTypeLabels: Record<string, string> = {
  tv_series: "TV Series", game: "Game", documentary: "Documentary",
  film: "Film", trailer: "Trailer", advertisement: "Ad / Campaign", short_film: "Short Film",
};

function daysSince(ts: Date | string | null): number | null {
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
}

export default async function SyncPitchesPage() {
  const slug   = process.env.ARTIST_SLUG ?? "reverbzn";
  const artist = await getArtistBySlug(slug);
  if (!artist) return null;

  const [opportunities, pitches, allInsights] = await Promise.all([
    getSyncOpportunities(artist.id),
    getSyncPitches(artist.id),
    getInsights(artist.id),
  ]);

  const licensed    = pitches.filter(p => p.status === "licensed");
  const shortlisted = pitches.filter(p => p.status === "shortlisted");
  const submitted   = pitches.filter(p => p.status === "submitted");
  const totalFees   = licensed.reduce((s, p) => s + (p.licensingFeeUsd ?? 0), 0);
  const winRate     = pitches.length > 0 ? Math.round((licensed.length / pitches.length) * 100) : 0;
  const syncInsights = allInsights.filter(i => i.type === "opportunity").slice(0, 4);

  return (
    <div className="flex flex-col">
      <Header
        title="Sync Pitch Engine"
        subtitle="Opportunities · active pitches · licensing tracker"
      />

      <div className="p-6 space-y-8">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Pitches"  value={pitches.length}               icon={<Film className="w-5 h-5" />}       accent="cyan"    delay={0}    />
          <MetricCard title="Win Rate"       value={`${winRate}%`}                icon={<Target className="w-5 h-5" />}     accent="emerald" delay={0.05} />
          <MetricCard title="Shortlisted"    value={shortlisted.length}           icon={<TrendingUp className="w-5 h-5" />} accent="violet"  sublabel="Awaiting decision" delay={0.1} />
          <MetricCard title="Total Licensed" value={`$${totalFees.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} accent="amber" sublabel={`${licensed.length} deals closed`} delay={0.15} />
        </div>

        {/* Kanban Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Open Opps",   count: opportunities.filter(o => o.status === "open").length, accent: "bg-cyan/10 border-cyan/20 text-cyan"          },
            { label: "Submitted",   count: submitted.length,                                       accent: "bg-violet/10 border-violet/20 text-violet"    },
            { label: "Shortlisted", count: shortlisted.length,                                     accent: "bg-amber/10 border-amber/20 text-amber"       },
            { label: "Licensed",    count: licensed.length,                                        accent: "bg-emerald/10 border-emerald/20 text-emerald"  },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-4 text-center ${s.accent}`}>
              <p className="text-3xl font-bold">{s.count}</p>
              <p className="text-xs font-mono uppercase tracking-wider mt-1 opacity-80">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Open Opportunities */}
        {opportunities.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground font-mono">No sync opportunities yet.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Open Sync Opportunities</h2>
                <p className="text-xs text-muted-foreground font-mono">Active briefs seeking music placement</p>
              </div>
              <Badge className="text-xs font-mono bg-emerald/10 text-emerald border-emerald/20">
                {opportunities.filter(o => o.status === "open").length} active
              </Badge>
            </div>
            <div className="divide-y divide-border/30">
              {opportunities.map((opp) => (
                <div key={opp.id} className="p-5 hover:bg-white/2 transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className="text-[10px] font-mono bg-white/5 text-muted-foreground border-white/10 shrink-0">
                          {mediaTypeLabels[opp.mediaType] ?? opp.mediaType}
                        </Badge>
                        {opp.status === "reviewing" && (
                          <Badge className="text-[10px] font-mono bg-amber/10 text-amber border-amber/20">Reviewing</Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground text-sm leading-snug">{opp.title}</h3>
                      {opp.supervisor && (
                        <p className="text-xs text-muted-foreground mt-0.5">{opp.supervisor.name} · {opp.supervisor.company}</p>
                      )}
                    </div>
                    {(opp.budgetMinUsd || opp.budgetMaxUsd) && (
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-emerald">
                          ${(opp.budgetMinUsd ?? 0).toLocaleString()}–${(opp.budgetMaxUsd ?? 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Budget USD</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    {opp.deadline && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Due {opp.deadline}
                      </span>
                    )}
                    {(opp.bpmMin || opp.bpmMax) && (
                      <span>BPM {opp.bpmMin ?? "?"}–{opp.bpmMax ?? "?"}</span>
                    )}
                    {opp.needsVocals !== null && opp.needsVocals !== undefined && (
                      <span className={opp.needsVocals ? "text-cyan" : "text-muted-foreground"}>
                        {opp.needsVocals ? "Vocals required" : "Instrumental OK"}
                      </span>
                    )}
                    {opp.moodTags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {opp.moodTags.slice(0, 4).map(tag => (
                          <Badge key={tag} className="text-[10px] font-mono bg-violet/10 text-violet border-violet/20">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Link href="/sync-library" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan/10 border border-cyan/20 text-cyan text-xs font-medium hover:bg-cyan/20 transition-colors">
                      <Zap className="w-3 h-3" /> Find best tracks
                    </Link>
                    <Link href="/music-supervisors" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 border border-border/40 text-muted-foreground text-xs font-medium hover:bg-white/10 transition-colors">
                      View supervisor
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pitch Tracker */}
        {pitches.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground font-mono">No pitches submitted yet.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50">
              <h2 className="text-sm font-semibold text-foreground">Pitch Tracker</h2>
              <p className="text-xs text-muted-foreground font-mono">All submitted pitches and their current status</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30 bg-white/2">
                    <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Track</th>
                    <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Opportunity</th>
                    <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Status</th>
                    <th className="text-right px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Days ago</th>
                    <th className="text-right px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Fee (USD)</th>
                    <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {pitches.map((p) => {
                    const sc   = statusConfig[p.status] ?? statusConfig.draft;
                    const days = daysSince(p.submittedAt ?? p.createdAt);
                    return (
                      <tr key={p.id} className="hover:bg-white/2 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-medium text-foreground text-sm">{p.track.title}</span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-[200px] truncate">
                          {p.opportunity.title}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge className={`text-[10px] font-mono flex items-center gap-1 w-fit ${sc.class}`}>
                            {sc.icon}{sc.label}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs text-muted-foreground">
                          {days !== null ? `${days}d` : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-sm">
                          {(p.licensingFeeUsd ?? 0) > 0
                            ? <span className="font-semibold text-emerald">${p.licensingFeeUsd!.toLocaleString()}</span>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-[240px] truncate">
                          {p.pitchNotes ?? p.responseNotes ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI Sync Recommendations */}
        {syncInsights.length > 0 && (
          <div className="rounded-xl border border-cyan/20 bg-cyan/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-cyan" />
              <h2 className="text-sm font-semibold text-cyan">AI Sync Recommendations</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {syncInsights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-black/20 border border-border/30">
                  <span className="text-lg shrink-0">💡</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
