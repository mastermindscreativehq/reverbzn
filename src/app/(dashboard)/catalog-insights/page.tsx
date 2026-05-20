export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, TrendingDown, Star, Music2, AlertTriangle, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { getArtistBySlug, getCatalogInsights, getPlaylistHistory } from "@/lib/db/queries";

const insightTypeConfig: Record<string, { label: string; icon: React.ReactNode; accentClass: string; bgClass: string }> = {
  sleeper_hit:       { label: "Sleeper Hit",  icon: <Star className="w-4 h-4" />,          accentClass: "text-amber",       bgClass: "border-amber/20 bg-amber/5"             },
  stream_decay:      { label: "Stream Decay", icon: <TrendingDown className="w-4 h-4" />,   accentClass: "text-destructive", bgClass: "border-destructive/20 bg-destructive/5" },
  revival_candidate: { label: "Revival",      icon: <Zap className="w-4 h-4" />,            accentClass: "text-violet",      bgClass: "border-violet/20 bg-violet/5"           },
  evergreen_alert:   { label: "Evergreen",    icon: <Star className="w-4 h-4" />,           accentClass: "text-emerald",     bgClass: "border-emerald/20 bg-emerald/5"         },
  breakout_signal:   { label: "Breakout",     icon: <ArrowUpRight className="w-4 h-4" />,   accentClass: "text-cyan",        bgClass: "border-cyan/20 bg-cyan/5"               },
  era_peak:          { label: "Era Peak",     icon: <Music2 className="w-4 h-4" />,          accentClass: "text-violet",      bgClass: "border-violet/20 bg-violet/5"           },
};

const urgencyConfig: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  high:     "bg-amber/10 text-amber border-amber/20",
  medium:   "bg-cyan/10 text-cyan border-cyan/20",
  low:      "bg-white/5 text-muted-foreground border-white/10",
};

const urgencyOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default async function CatalogInsightsPage() {
  const slug   = process.env.ARTIST_SLUG ?? "reverbzn";
  const artist = await getArtistBySlug(slug);
  if (!artist) return null;

  const [insights, playlists] = await Promise.all([
    getCatalogInsights(artist.id),
    getPlaylistHistory(artist.id),
  ]);

  const criticalCount  = insights.filter(i => i.urgency === "critical").length;
  const highCount      = insights.filter(i => i.urgency === "high").length;

  const sorted = [...insights].sort((a, b) =>
    (urgencyOrder[a.urgency] ?? 9) - (urgencyOrder[b.urgency] ?? 9)
  );

  return (
    <div className="flex flex-col">
      <Header
        title="Catalog Insights"
        subtitle="AI-powered lifecycle analysis · revival recommendations · decay alerts"
      />

      <div className="p-6 space-y-8">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Insights" value={insights.length}  icon={<Sparkles className="w-5 h-5" />}     accent="cyan"        delay={0}    />
          <MetricCard title="Critical"       value={criticalCount}    icon={<AlertTriangle className="w-5 h-5" />} accent="destructive" delay={0.05} />
          <MetricCard title="High Priority"  value={highCount}        icon={<Zap className="w-5 h-5" />}          accent="amber"       delay={0.1}  />
          <MetricCard title="Playlist Slots" value={playlists.filter(p => !p.removedAt).length} icon={<Star className="w-5 h-5" />} accent="emerald" delay={0.15} sublabel="Active placements" />
        </div>

        {insights.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground font-mono">No catalog insights yet. Run lifecycle analysis to generate AI recommendations.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map((insight) => {
              const ic = insightTypeConfig[insight.insightType] ?? insightTypeConfig.sleeper_hit;
              return (
                <div key={insight.id} className={`rounded-xl border p-5 ${ic.bgClass}`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className={ic.accentClass}>{ic.icon}</div>
                      <Badge className={`text-[10px] font-mono ${urgencyConfig[insight.urgency] ?? urgencyConfig.low}`}>{insight.urgency}</Badge>
                      <Badge className="text-[10px] font-mono bg-white/5 text-muted-foreground border-white/10">{ic.label}</Badge>
                      {insight.trackTitle && (
                        <Badge className="text-[10px] font-mono bg-white/5 text-muted-foreground border-white/10">
                          <Music2 className="w-2.5 h-2.5 mr-1" />{insight.trackTitle}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <h3 className={`text-sm font-bold mb-2 ${ic.accentClass}`}>{insight.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">{insight.body}</p>

                  {insight.action && (
                    <div className="flex items-start gap-2 pt-3 border-t border-white/10">
                      <Zap className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${ic.accentClass}`} />
                      <p className="text-xs text-foreground font-medium leading-relaxed">{insight.action}</p>
                    </div>
                  )}
                  <div className="mt-2 flex justify-end">
                    <Link href="/catalog" className={`text-xs font-medium underline ${ic.accentClass} hover:opacity-80 transition-opacity`}>
                      View catalog
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Playlist History */}
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Playlist History</h2>
            <Badge className="text-xs font-mono bg-white/5 text-muted-foreground border-white/10">{playlists.length} placements</Badge>
          </div>
          {playlists.length === 0 ? (
            <p className="text-xs text-muted-foreground font-mono">No playlist history recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    {["Track", "Playlist", "Platform", "Followers", "Added", "Status", "Impact"].map(h => (
                      <th key={h} className="text-left pb-3 text-xs font-mono text-muted-foreground uppercase last:text-right">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {playlists.map((row) => (
                    <tr key={row.id} className="hover:bg-white/2 transition-colors">
                      <td className="py-3 font-medium text-foreground text-xs">{row.trackTitle}</td>
                      <td className="py-3 text-xs text-muted-foreground truncate max-w-[160px]">{row.playlistName}</td>
                      <td className="py-3">
                        <Badge className="text-[9px] font-mono bg-white/5 text-muted-foreground border-white/10">{row.platformName}</Badge>
                      </td>
                      <td className="py-3 text-right font-mono text-xs text-muted-foreground">
                        {row.followerCount >= 1000 ? `${(row.followerCount / 1000).toFixed(0)}K` : row.followerCount}
                      </td>
                      <td className="py-3 text-xs font-mono text-muted-foreground">{row.addedAt}</td>
                      <td className="py-3">
                        <Badge className={`text-[9px] font-mono ${row.removedAt ? "bg-white/5 text-muted-foreground border-white/10" : "bg-emerald/10 text-emerald border-emerald/20"}`}>
                          {row.removedAt ? `Removed` : "Active"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-mono text-xs text-cyan">{row.impactStreams.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
