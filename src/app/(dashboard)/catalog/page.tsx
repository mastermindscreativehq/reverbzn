export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RzAreaChart } from "@/components/charts/area-chart";
import { Badge } from "@/components/ui/badge";
import { BookOpen, TrendingUp, TrendingDown, Zap, Star, BarChart3, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getArtistBySlug, getCatalogWithLifecycle } from "@/lib/db/queries";

const phaseConfig: Record<string, { label: string; class: string; dot: string }> = {
  rising:    { label: "Rising",    class: "bg-emerald/10 text-emerald border-emerald/20",                    dot: "bg-emerald" },
  peak:      { label: "Peak",      class: "bg-cyan/10 text-cyan border-cyan/20",                             dot: "bg-cyan"    },
  plateau:   { label: "Plateau",   class: "bg-violet/10 text-violet border-violet/20",                      dot: "bg-violet"  },
  declining: { label: "Declining", class: "bg-amber/10 text-amber border-amber/20",                          dot: "bg-amber"   },
  dormant:   { label: "Dormant",   class: "bg-white/5 text-muted-foreground border-white/10",               dot: "bg-muted-foreground" },
  evergreen: { label: "Evergreen", class: "bg-emerald/20 text-emerald border-emerald/30",                   dot: "bg-emerald animate-pulse" },
};

const phaseOrder = ["evergreen", "rising", "peak", "plateau", "declining", "dormant"];

export default async function CatalogPage() {
  const slug   = process.env.ARTIST_SLUG ?? "reverbzn";
  const artist = await getArtistBySlug(slug);
  if (!artist) return null;

  const catalogData = await getCatalogWithLifecycle(artist.id);

  const evergreenCount = catalogData.filter(t => t.phase === "evergreen").length;
  const risingCount    = catalogData.filter(t => t.phase === "rising").length;
  const dormantCount   = catalogData.filter(t => t.phase === "dormant").length;
  const avgDecay       = catalogData.length > 0
    ? (catalogData.reduce((s, t) => s + t.decayRate, 0) / catalogData.length).toFixed(1)
    : "0.0";
  const totalMonthly   = catalogData.reduce((s, t) => s + t.currentMonthly, 0);

  const sorted = [...catalogData].sort((a, b) => {
    const ao = phaseOrder.indexOf(a.phase);
    const bo = phaseOrder.indexOf(b.phase);
    return (ao < 0 ? 9 : ao) - (bo < 0 ? 9 : bo);
  });

  const topFour = catalogData
    .sort((a, b) => b.currentMonthly - a.currentMonthly)
    .slice(0, 4);

  const revivalCandidates = catalogData
    .filter(t => ["dormant", "declining"].includes(t.phase) && t.revivalPotential >= 60)
    .sort((a, b) => b.revivalPotential - a.revivalPotential);

  if (catalogData.length === 0) {
    return (
      <div className="flex flex-col">
        <Header title="Catalog Intelligence" subtitle="Track lifecycle · stream decay · evergreen scoring" />
        <div className="p-6">
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground font-mono">No catalog tracks yet. Seed catalog data or connect a DSP to begin lifecycle analysis.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Catalog Intelligence"
        subtitle="Track lifecycle · stream decay · evergreen scoring · revival opportunities"
      />

      <div className="p-6 space-y-8">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Catalog Size"     value={catalogData.length}                      icon={<BookOpen className="w-5 h-5" />}     accent="cyan"    delay={0}    />
          <MetricCard title="Evergreen Tracks" value={evergreenCount}                           icon={<Star className="w-5 h-5" />}        accent="emerald" delay={0.05} />
          <MetricCard title="Monthly Streams"  value={`${(totalMonthly / 1000).toFixed(0)}K`}  icon={<BarChart3 className="w-5 h-5" />}   accent="violet"  delay={0.1}  sublabel="Active catalog total" />
          <MetricCard title="Avg Decay Rate"   value={`${avgDecay}%/wk`}                       icon={<TrendingDown className="w-5 h-5" />} accent="amber"   delay={0.15} sublabel="Lower = more evergreen" />
        </div>

        {/* Phase Summary */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {phaseOrder.map(phase => {
            const count = catalogData.filter(t => t.phase === phase).length;
            const pc    = phaseConfig[phase];
            return (
              <div key={phase} className={`rounded-xl border p-3 text-center ${pc.class}`}>
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-[10px] font-mono uppercase tracking-wider mt-1 opacity-80">{pc.label}</p>
              </div>
            );
          })}
        </div>

        {/* Catalog Table */}
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Track Lifecycle Overview</h2>
              <p className="text-xs text-muted-foreground font-mono">Lifecycle phase, decay rates, and revival potential</p>
            </div>
            <Link href="/catalog-insights" className="text-xs text-cyan hover:text-cyan/80 flex items-center gap-1">
              AI Insights <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30 bg-white/2">
                  {["Track", "Phase", "Monthly", "Decay/wk", "Playlists", "Evergreen", "Revival Pot.", "AI Note"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-mono text-muted-foreground uppercase tracking-wider first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {sorted.map((track) => {
                  const pc = phaseConfig[track.phase] ?? phaseConfig.dormant;
                  return (
                    <tr key={track.slug} className="hover:bg-white/2 transition-colors">
                      <td className="pl-5 pr-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${pc.dot}`} />
                          <span className="font-medium text-foreground text-sm">{track.title}</span>
                        </div>
                        {track.genres.length > 0 && (
                          <p className="text-[10px] font-mono text-muted-foreground pl-3.5">{track.genres.join(", ")}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge className={`text-[10px] font-mono ${pc.class}`}>{pc.label}</Badge>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-sm text-foreground">
                        {(track.currentMonthly / 1000).toFixed(1)}K
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs">
                        <span className={track.decayRate > 8 ? "text-destructive" : track.decayRate > 4 ? "text-amber" : track.decayRate > 0 ? "text-muted-foreground" : "text-emerald"}>
                          {track.decayRate > 0 ? "-" : "+"}{Math.abs(track.decayRate)}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-foreground">{track.totalPlaylists}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 rounded-full bg-white/5">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald to-cyan" style={{ width: `${track.evergreenScore}%` }} />
                          </div>
                          <span className="text-xs font-mono text-foreground">{track.evergreenScore}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 rounded-full bg-white/5">
                            <div className={`h-full rounded-full ${track.revivalPotential >= 70 ? "bg-violet" : "bg-white/30"}`} style={{ width: `${track.revivalPotential}%` }} />
                          </div>
                          <span className={`text-xs font-mono ${track.revivalPotential >= 70 ? "text-violet" : "text-muted-foreground"}`}>{track.revivalPotential}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground max-w-[200px] truncate">{track.aiNote}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stream Trajectory Charts — top 4 tracks */}
        {topFour.some(t => t.weeklyTrend.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Stream Trajectory</h2>
              <p className="text-xs text-muted-foreground font-mono">Weekly streams — lifecycle visualised</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {topFour.filter(t => t.weeklyTrend.length > 0).map(track => {
                const pc       = phaseConfig[track.phase] ?? phaseConfig.dormant;
                const isGrowing = track.decayRate < 0;
                return (
                  <div key={track.slug} className="rounded-xl border border-border/50 bg-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-foreground">{track.title}</h3>
                          <Badge className={`text-[9px] font-mono ${pc.class}`}>{pc.label}</Badge>
                        </div>
                        {track.genres.length > 0 && (
                          <p className="text-[10px] font-mono text-muted-foreground">{track.genres.join(", ")}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {isGrowing
                          ? <TrendingUp className="w-3.5 h-3.5 text-emerald" />
                          : <TrendingDown className={`w-3.5 h-3.5 ${track.decayRate > 8 ? "text-destructive" : "text-amber"}`} />
                        }
                        <span className={`text-xs font-mono ${isGrowing ? "text-emerald" : track.decayRate > 8 ? "text-destructive" : "text-amber"}`}>
                          {isGrowing ? "+" : "-"}{Math.abs(track.decayRate)}%/wk
                        </span>
                      </div>
                    </div>
                    <RzAreaChart
                      data={track.weeklyTrend}
                      color={isGrowing ? "oklch(0.75 0.18 160)" : track.decayRate > 8 ? "oklch(0.65 0.22 25)" : "oklch(0.78 0.16 196)"}
                      label="Streams"
                      height={120}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Revival Candidates */}
        {revivalCandidates.length > 0 && (
          <div className="rounded-xl border border-violet/20 bg-violet/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-violet" />
              <h2 className="text-sm font-semibold text-violet">Top Revival Candidates</h2>
              <Badge className="text-xs font-mono bg-violet/20 text-violet border-violet/30">AI</Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {revivalCandidates.slice(0, 3).map(track => (
                <div key={track.slug} className="p-4 rounded-lg bg-black/20 border border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-foreground text-sm">{track.title}</p>
                    <span className="text-violet font-bold text-lg">{track.revivalPotential}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 mb-2">
                    <div className="h-full rounded-full bg-violet" style={{ width: `${track.revivalPotential}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{track.aiNote}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
