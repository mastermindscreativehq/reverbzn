export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RzBarChart } from "@/components/charts/bar-chart";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Users, DollarSign, Star, Zap, Mail, MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  getArtistBySlug,
  getFanScoreLeaderboard,
  getFanClusterSummary,
  getFanLocationHeatmap,
  getFanIntelMetrics,
  getInsights,
} from "@/lib/db/queries";

const clusterConfig: Record<string, string> = {
  superfan: "bg-emerald/10 text-emerald border-emerald/20",
  core:     "bg-cyan/10 text-cyan border-cyan/20",
  casual:   "bg-violet/10 text-violet border-violet/20",
  dormant:  "bg-white/5 text-muted-foreground border-white/10",
  new:      "bg-amber/10 text-amber border-amber/20",
};

export default async function FanIntelPage() {
  const slug   = process.env.ARTIST_SLUG ?? "reverbzn";
  const artist = await getArtistBySlug(slug);
  if (!artist) return null;

  const [leaderboard, clusters, locations, metrics, allInsights] = await Promise.all([
    getFanScoreLeaderboard(artist.id),
    getFanClusterSummary(artist.id),
    getFanLocationHeatmap(artist.id),
    getFanIntelMetrics(artist.id),
    getInsights(artist.id),
  ]);

  const aiInsights = allInsights
    .filter(i => i.type === "fan")
    .slice(0, 4)
    .map(i => ({ icon: "💡", text: i.message }));

  const topCityBarData = locations.slice(0, 6).map(c => ({
    label: c.city,
    value: c.fans,
    color: c.cc === "NG" ? "#22d3ee" : c.cc === "GB" ? "#a78bfa" : c.cc === "GH" ? "#34d399" : "#fbbf24",
  }));

  const telegramActive  = Math.round(metrics.telegramTotal * 0.63);
  const telegramCvr     = metrics.listeners > 0
    ? Math.round((metrics.telegramTotal / metrics.listeners) * 100 * 10) / 10
    : 0;
  const superfanPct     = metrics.telegramTotal > 0
    ? Math.round((metrics.superfans / metrics.telegramTotal) * 100 * 100) / 100
    : 0;

  return (
    <div className="flex flex-col">
      <Header
        title="Fan Intelligence"
        subtitle="Superfan scoring · engagement clusters · city heatmaps · lifetime value"
      />

      <div className="p-6 space-y-8">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Owned Audience"      value={metrics.totalFans.toLocaleString()}     icon={<Users className="w-5 h-5" />}          accent="cyan"    delay={0}    />
          <MetricCard title="Superfans"            value={metrics.superfans}                       icon={<Star className="w-5 h-5" />}           accent="emerald" delay={0.05} sublabel="Top engagement tier" />
          <MetricCard title="Telegram Community"   value={metrics.telegramTotal.toLocaleString()}  icon={<MessageSquare className="w-5 h-5" />}  accent="violet"  delay={0.1}  />
          <MetricCard title="Avg LTV Score"        value={`${metrics.avgLtv}/100`}                icon={<DollarSign className="w-5 h-5" />}     accent="amber"   delay={0.15} sublabel="Fan lifetime value" />
        </div>

        {/* Engagement Clusters */}
        {clusters.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {clusters.map((c) => (
              <div key={c.cluster} className="rounded-xl border border-border/50 bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={`text-[10px] font-mono capitalize ${c.badge}`}>{c.cluster}</Badge>
                  <span className="text-2xl font-bold text-foreground">{c.count}</span>
                </div>
                <div className="space-y-1.5 mb-3">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground">Avg LTV</span>
                    <span className="text-foreground">{c.avgLtv}/100</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground">Spend Potential</span>
                    <span className="text-emerald">${c.avgSpend}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground">Telegram CVR</span>
                    <span className="text-foreground">{c.telegramPct}%</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Superfan Table + Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Superfan Scores</h2>
                <p className="text-xs text-muted-foreground font-mono">LTV, engagement, and spend potential</p>
              </div>
              <Link href="/fans" className="text-xs text-cyan hover:text-cyan/80 flex items-center gap-1">
                Full CRM <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {leaderboard.length === 0 ? (
              <p className="px-5 py-8 text-xs text-muted-foreground font-mono">No fan scores yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30 bg-white/2">
                      {["Fan", "Location", "Cluster", "LTV", "Engagement", "Spend Pot.", "Channels"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-mono text-muted-foreground uppercase first:pl-5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {leaderboard.map((fan) => (
                      <tr key={fan.fanId} className="hover:bg-white/2 transition-colors">
                        <td className="pl-5 pr-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan/30 to-violet/30 flex items-center justify-center text-[9px] font-bold text-foreground shrink-0">
                              {fan.displayName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                            <span className="font-medium text-foreground truncate max-w-[100px]">{fan.displayName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{[fan.city, fan.country].filter(Boolean).join(", ") || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge className={`text-[9px] font-mono capitalize ${clusterConfig[fan.cluster] ?? ""}`}>{fan.cluster}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-8 h-1 rounded-full bg-white/5">
                              <div className="h-full rounded-full bg-gradient-to-r from-cyan to-emerald" style={{ width: `${fan.ltvScore}%` }} />
                            </div>
                            <span className="font-mono text-foreground">{fan.ltvScore}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-foreground">{fan.engagement30d}</td>
                        <td className="px-4 py-3 font-mono text-emerald">${fan.spendPotentialUsd}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {fan.telegramConverted && <MessageSquare className="w-3 h-3 text-cyan" />}
                            {fan.emailConverted    && <Mail className="w-3 h-3 text-violet" />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Conversion Funnel */}
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-1">Conversion Funnel</h2>
            <p className="text-xs text-muted-foreground font-mono mb-4">Listener → Superfan pipeline</p>
            <div className="space-y-2">
              {metrics.funnel.map((stage, i) => {
                const pct = metrics.funnel[0].count > 0
                  ? Math.max(Math.round((stage.count / metrics.funnel[0].count) * 100), stage.count > 0 ? 1 : 0)
                  : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{stage.stage}</span>
                      <span className="text-xs font-mono font-semibold text-foreground">{stage.count.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/5">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: stage.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-border/30">
              <p className="text-xs text-muted-foreground font-mono">Overall CVR</p>
              <p className="text-2xl font-bold text-cyan mt-0.5">{metrics.overallCvr}%</p>
              <p className="text-xs text-muted-foreground font-mono">Listener → community</p>
            </div>
          </div>
        </div>

        {/* City Heatmap */}
        {locations.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">City Heatmap</h2>
              <div className="space-y-2.5">
                {locations.map((city) => {
                  const maxFans = locations[0]?.fans ?? 1;
                  const pct    = Math.round((city.fans / maxFans) * 100);
                  return (
                    <div key={`${city.city}-${city.cc}`} className="flex items-center gap-3">
                      <span className="text-base shrink-0">{city.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium text-foreground truncate">{city.city}</span>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            {city.superfans > 0 && (
                              <span className="text-[10px] font-mono text-emerald">{city.superfans} 💎</span>
                            )}
                            <span className="text-[10px] font-mono text-muted-foreground">{city.fans.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: city.engIndex >= 80 ? "#22d3ee" : city.engIndex >= 70 ? "#a78bfa" : "#fbbf24",
                            }}
                          />
                        </div>
                      </div>
                      <div className={`text-[10px] font-mono shrink-0 w-12 text-right ${city.engIndex >= 80 ? "text-cyan" : city.engIndex >= 70 ? "text-violet" : "text-amber"}`}>
                        {city.engIndex}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] font-mono text-muted-foreground mt-3">Bar width = fan count · Color = engagement index</p>
            </div>

            <div className="rounded-xl border border-border/50 bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Fans by City (Top 6)</h2>
              <RzBarChart data={topCityBarData} height={200} horizontal />
            </div>
          </div>
        )}

        {/* Telegram Stats + AI Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Telegram Channel Intelligence</h2>
            <div className="space-y-3">
              {[
                { metric: "Total Members",    value: metrics.telegramTotal.toLocaleString(), sub: "Across all markets",   accent: "text-cyan"    },
                { metric: "Active (30d)",     value: telegramActive.toLocaleString(),        sub: "Est. engaged members", accent: "text-emerald" },
                { metric: "Conversion Rate",  value: `${telegramCvr}%`,                     sub: "Listener → Telegram",  accent: "text-violet"  },
                { metric: "Superfan %",       value: `${superfanPct}%`,                     sub: "Of total community",   accent: "text-amber"   },
              ].map((row) => (
                <div key={row.metric} className="flex items-center justify-between p-3 rounded-lg bg-white/3 border border-border/20">
                  <div>
                    <p className="text-xs font-medium text-foreground">{row.metric}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{row.sub}</p>
                  </div>
                  <span className={`text-lg font-bold ${row.accent}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {aiInsights.length > 0 ? (
            <div className="rounded-xl border border-cyan/20 bg-cyan/5 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-cyan" />
                <h2 className="text-sm font-semibold text-cyan">AI Fan Intelligence</h2>
              </div>
              <div className="space-y-3">
                {aiInsights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-black/20 border border-border/30">
                    <span className="text-lg shrink-0">{insight.icon}</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">{insight.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-cyan/20">
                <Link href="/fans" className="flex items-center gap-1.5 text-sm text-cyan hover:text-cyan/80 font-medium transition-colors">
                  <Users className="w-4 h-4" /> Open Fan CRM
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 bg-card p-5 flex items-center gap-3">
              <BrainCircuit className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">AI Insights Pending</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">Fan intelligence will surface as data grows.</p>
                <Link href="/fans" className="text-xs text-cyan hover:text-cyan/80 flex items-center gap-1 mt-2">
                  Open Fan CRM <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
