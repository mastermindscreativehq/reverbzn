export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { getArtistBySlug, getPlatformSummaries, getPlatformTrends } from "@/lib/db/queries";
import { RzAreaChart } from "@/components/charts/area-chart";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

const ARTIST_SLUG = process.env.ARTIST_SLUG ?? "reverbzn";

const CHART_COLORS: Record<string, string> = {
  spotify:     "oklch(0.72 0.2 155)",
  apple_music: "oklch(0.65 0.22 25)",
  audiomack:   "oklch(0.78 0.18 75)",
  boomplay:    "oklch(0.65 0.22 25)",
  youtube:     "oklch(0.65 0.22 25)",
  soundcloud:  "oklch(0.72 0.18 55)",
};

export default async function PlatformsPage() {
  const artist = await getArtistBySlug(ARTIST_SLUG);
  if (!artist) {
    return (
      <div className="flex flex-col">
        <Header title="Platform Analytics" subtitle="No artist found" />
        <div className="p-6">
          <p className="text-sm text-muted-foreground font-mono">Run <code>npm run db:seed</code> first.</p>
        </div>
      </div>
    );
  }

  const platforms = await getPlatformSummaries(artist.id);

  // Pre-fetch trends for all platforms in parallel
  const trendsEntries = await Promise.all(
    platforms.map(p =>
      getPlatformTrends(artist.id, p.platformSlug).then(t => [p.platformSlug, t] as const)
    )
  );
  const trendsMap = new Map(trendsEntries);

  const sorted = [...platforms].sort((a, b) => b.totalStreams - a.totalStreams);

  return (
    <div className="flex flex-col">
      <Header title="Platform Analytics" subtitle="Performance across all streaming platforms" />
      <div className="p-6 space-y-6">

        {platforms.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No platform data yet.</p>
          </div>
        ) : (
          <>
            {/* Platform Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {platforms.map(p => {
                const chartData = trendsMap.get(p.platformSlug) ?? [];
                const chartColor = CHART_COLORS[p.platformSlug] ?? "oklch(0.78 0.16 196)";
                const isGrowing = p.weeklyGrowthPct > 10;
                return (
                  <div key={p.platformSlug} className="rounded-xl border border-border/50 bg-card p-5 hover:border-white/20 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                          <h3 className="text-sm font-semibold text-foreground">{p.platformName}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">Top: {p.topTrack}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {isGrowing
                          ? <TrendingUp className="w-3.5 h-3.5 text-emerald" />
                          : <TrendingDown className="w-3.5 h-3.5 text-destructive" />}
                        <span className={`text-xs font-mono font-semibold ${isGrowing ? "text-emerald" : "text-destructive"}`}>
                          {p.weeklyGrowthPct > 0 ? "+" : ""}{p.weeklyGrowthPct}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">Streams</p>
                        <p className="text-lg font-bold text-foreground">{(p.totalStreams / 1000).toFixed(0)}K</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">Listeners</p>
                        <p className="text-lg font-bold text-foreground">{(p.totalListeners / 1000).toFixed(0)}K</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">Revenue Est.</p>
                        <p className="text-base font-bold text-emerald">${p.revenueEstimateUsd.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">Promo Score</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-12 h-1.5 rounded-full bg-white/5">
                            <div className="h-full rounded-full bg-cyan" style={{ width: `${p.promoEfficiencyScore}%` }} />
                          </div>
                          <span className="text-xs font-mono font-bold text-foreground">{p.promoEfficiencyScore}</span>
                        </div>
                      </div>
                    </div>

                    <RzAreaChart data={chartData} color={chartColor} label="Streams" height={80} />
                  </div>
                );
              })}
            </div>

            {/* Comparison Table */}
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50">
                <h2 className="text-sm font-semibold text-foreground">Platform Comparison</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      {["Platform", "Streams", "Listeners", "Revenue", "WoW Growth", "Promo Score", "Recommendation"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(p => {
                      const isTop = p.promoEfficiencyScore >= 85;
                      const rec = p.promoEfficiencyScore >= 85
                        ? "↑ Increase budget"
                        : p.promoEfficiencyScore >= 70
                        ? "→ Maintain current"
                        : "↓ Reduce & reallocate";
                      return (
                        <tr key={p.platformSlug} className="border-b border-border/20 hover:bg-white/2 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                              <span className="font-medium text-foreground">{p.platformName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-foreground">{p.totalStreams.toLocaleString()}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">{p.totalListeners.toLocaleString()}</td>
                          <td className="px-4 py-3 font-mono font-semibold text-emerald">${p.revenueEstimateUsd.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <Badge className={`text-[10px] font-mono ${p.weeklyGrowthPct > 15 ? "bg-emerald/10 text-emerald border-emerald/20" : "bg-cyan/10 text-cyan border-cyan/20"}`}>
                              {p.weeklyGrowthPct > 0 ? "+" : ""}{p.weeklyGrowthPct}%
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-white/5">
                                <div className={`h-full rounded-full ${isTop ? "bg-emerald" : "bg-cyan"}`} style={{ width: `${p.promoEfficiencyScore}%` }} />
                              </div>
                              <span className="text-xs font-mono">{p.promoEfficiencyScore}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{rec}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
