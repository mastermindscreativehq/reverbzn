export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays, Zap, CheckCircle2, Circle, Clock, AlertTriangle,
  Music2, Globe, Target, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { getArtistBySlug, getReleasesWithDetails } from "@/lib/db/queries";

const statusConfig: Record<string, { label: string; class: string }> = {
  concept:   { label: "Concept",   class: "bg-white/5 text-muted-foreground border-white/10"  },
  recording: { label: "Recording", class: "bg-amber/10 text-amber border-amber/20"             },
  mixing:    { label: "Mixing",    class: "bg-amber/10 text-amber border-amber/20"             },
  mastered:  { label: "Mastered",  class: "bg-cyan/10 text-cyan border-cyan/20"               },
  submitted: { label: "Submitted", class: "bg-violet/10 text-violet border-violet/20"         },
  scheduled: { label: "Scheduled", class: "bg-violet/10 text-violet border-violet/20"         },
  released:  { label: "Released",  class: "bg-emerald/10 text-emerald border-emerald/20"      },
};

const assetStatusConfig: Record<string, { dot: string; label: string }> = {
  approved:    { dot: "bg-emerald", label: "Approved"    },
  ready:       { dot: "bg-cyan",    label: "Ready"       },
  in_progress: { dot: "bg-amber",   label: "In Progress" },
  pending:     { dot: "bg-white/30", label: "Pending"    },
};

function HealthBar({ score }: { score: number }) {
  const color = score >= 80 ? "from-emerald to-cyan" : score >= 60 ? "from-cyan to-violet" : score >= 40 ? "from-amber to-amber" : "from-destructive to-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/5">
        <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-bold ${score >= 80 ? "text-emerald" : score >= 60 ? "text-cyan" : score >= 40 ? "text-amber" : "text-destructive"}`}>
        {score}
      </span>
    </div>
  );
}

export default async function ReleasesPage() {
  const slug   = process.env.ARTIST_SLUG ?? "reverbzn";
  const artist = await getArtistBySlug(slug);
  if (!artist) return null;

  const releases = await getReleasesWithDetails(artist.id);

  const upcoming = releases.filter(r => r.status !== "released");
  const nextUp   = upcoming.sort((a, b) => {
    if (!a.releaseDate) return 1;
    if (!b.releaseDate) return -1;
    return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
  })[0];

  const totalPreSaves = releases.reduce((s, r) => s + r.preSaveCount, 0);
  const avgHealth     = releases.length > 0
    ? Math.round(releases.reduce((s, r) => s + r.healthScore, 0) / releases.length)
    : 0;

  return (
    <div className="flex flex-col">
      <Header
        title="Release OS"
        subtitle="Release calendar · rollout stages · DSP readiness · campaign orchestration"
      />

      <div className="p-6 space-y-8">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Upcoming Releases" value={upcoming.length} icon={<CalendarDays className="w-5 h-5" />} accent="cyan"    delay={0}    sublabel="In pipeline" />
          <MetricCard title="Next Release"      value={nextUp ? (nextUp.releaseDate ?? "TBD") : "TBD"} icon={<Clock className="w-5 h-5" />} accent="violet" delay={0.05} sublabel={nextUp?.title ?? "None scheduled"} />
          <MetricCard title="Pre-Saves"         value={totalPreSaves.toLocaleString()} icon={<Target className="w-5 h-5" />} accent="emerald" delay={0.1}  />
          <MetricCard title="Avg Health Score"  value={`${avgHealth}/100`} icon={<Zap className="w-5 h-5" />} accent="amber" delay={0.15} />
        </div>

        {releases.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground font-mono">No releases yet. Create your first release to start planning.</p>
          </div>
        ) : (
          releases.map((release) => {
            const sc = statusConfig[release.status] ?? statusConfig.concept;
            const checklistDone  = release.checklists.filter(c => c.isDone).length;
            const checklistTotal = release.checklists.length;
            const checklistPct   = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
            const typeLabel      = { single: "Single", ep: "EP", album: "Album", mixtape: "Mixtape", compilation: "Compilation" }[release.releaseType] ?? release.releaseType;

            return (
              <div key={release.id} className={`rounded-xl border bg-card overflow-hidden ${release.status === "mastered" ? "border-cyan/30" : release.status === "released" ? "border-emerald/30" : "border-border/50"}`}>
                {/* Header */}
                <div className="px-5 py-4 border-b border-border/30 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan/20 to-violet/30 flex items-center justify-center shrink-0">
                      <Music2 className="w-5 h-5 text-cyan" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h2 className="text-base font-bold text-foreground">{release.title}</h2>
                        <Badge className="text-[10px] font-mono bg-white/5 text-muted-foreground border-white/10">{typeLabel}</Badge>
                        <Badge className={`text-[10px] font-mono ${sc.class}`}>{sc.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono flex-wrap">
                        {release.releaseDate && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" /> {release.releaseDate}
                          </span>
                        )}
                        {release.targetMarkets.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" /> {release.targetMarkets.slice(0, 3).join(", ")}
                            {release.targetMarkets.length > 3 && ` +${release.targetMarkets.length - 3}`}
                          </span>
                        )}
                        {release.targetStreams && (
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" /> Target: {(release.targetStreams / 1000).toFixed(0)}K streams
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono text-muted-foreground mb-1">Health Score</p>
                    <HealthBar score={release.healthScore} />
                  </div>
                </div>

                <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Checklist */}
                  {release.checklists.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Checklist</h3>
                        <span className="text-xs font-mono text-foreground">{checklistDone}/{checklistTotal}</span>
                      </div>
                      <div className="mb-3 w-full h-1.5 rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan to-emerald" style={{ width: `${checklistPct}%` }} />
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {release.checklists.map((item) => (
                          <div key={item.id} className="flex items-center gap-2">
                            {item.isDone
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald shrink-0" />
                              : <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                            }
                            <span className={`text-xs leading-tight ${item.isDone ? "text-muted-foreground line-through" : "text-foreground"}`}>
                              {item.item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assets */}
                  {release.assets.length > 0 && (
                    <div>
                      <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Assets</h3>
                      <div className="space-y-2">
                        {release.assets.map((asset) => {
                          const ac = assetStatusConfig[asset.status] ?? assetStatusConfig.pending;
                          return (
                            <div key={asset.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/3 border border-border/20">
                              <span className="text-xs text-foreground">{asset.label}</span>
                              <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${ac.dot}`} />
                                <span className="text-[10px] font-mono text-muted-foreground">{ac.label}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-lg bg-white/3 border border-border/20">
                          <p className="text-[10px] font-mono text-muted-foreground">Pre-Saves</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">{release.preSaveCount.toLocaleString()}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white/3 border border-border/20">
                          <p className="text-[10px] font-mono text-muted-foreground">DSPs</p>
                          <p className={`text-sm font-bold mt-0.5 ${release.dspsSubmitted ? "text-emerald" : "text-amber"}`}>
                            {release.dspsSubmitted ? "Submitted" : "Pending"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Recommendations */}
                  {release.aiRecommendations.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-3">
                        <Zap className="w-3.5 h-3.5 text-cyan" />
                        <h3 className="text-xs font-mono text-cyan uppercase tracking-wider">AI Rollout Recs</h3>
                      </div>
                      <div className="space-y-2">
                        {release.aiRecommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-[10px] font-mono text-cyan/60 shrink-0 mt-0.5">{i + 1}.</span>
                            <p className="text-xs text-muted-foreground leading-relaxed">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Campaigns */}
                {release.campaigns.length > 0 && (
                  <div className="px-5 pb-5">
                    <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Campaigns</h3>
                    <div className="flex flex-wrap gap-2">
                      {release.campaigns.map((c) => (
                        <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/3 border border-border/20">
                          <div className={`w-1.5 h-1.5 rounded-full ${c.status === "active" ? "bg-emerald animate-pulse" : "bg-white/20"}`} />
                          <span className="text-xs text-foreground">{c.name}</span>
                          <Badge className="text-[9px] font-mono bg-white/5 text-muted-foreground border-white/10">{c.channel}</Badge>
                          {c.actualReach && c.actualReach > 0 && (
                            <span className="text-[10px] font-mono text-muted-foreground">{c.actualReach.toLocaleString()} reach</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Release Calendar Summary */}
        {releases.length > 0 && (
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Release Calendar</h2>
              <Link href="/campaigns" className="text-xs text-cyan hover:text-cyan/80 flex items-center gap-1">
                Campaigns <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {releases.map((r) => {
                const sc = statusConfig[r.status] ?? statusConfig.concept;
                return (
                  <div key={r.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/3 transition-colors">
                    <div className="w-20 shrink-0">
                      <p className="text-xs font-mono text-muted-foreground">{r.releaseDate ?? "TBD"}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{r.title}</p>
                    </div>
                    <Badge className={`text-[10px] font-mono shrink-0 ${sc.class}`}>{sc.label}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
