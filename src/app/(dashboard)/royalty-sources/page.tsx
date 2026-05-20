export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RzBarChart } from "@/components/charts/bar-chart";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Activity, Globe } from "lucide-react";
import { getArtistBySlug, getRoyaltySourcesGrouped } from "@/lib/db/queries";

export default async function RoyaltySourcesPage() {
  const slug   = process.env.ARTIST_SLUG ?? "reverbzn";
  const artist = await getArtistBySlug(slug);
  if (!artist) return null;

  const dspSources = await getRoyaltySourcesGrouped(artist.id);

  const totalStreams = dspSources.reduce((s, d) => s + d.streams, 0);
  const totalRev     = dspSources.reduce((s, d) => s + d.totalUsd, 0);
  const avgRpm       = dspSources.length > 0
    ? (dspSources.reduce((s, d) => s + d.rpm, 0) / dspSources.length).toFixed(2)
    : "0.00";
  const topDsp       = dspSources.length > 0
    ? dspSources.reduce((a, b) => a.totalUsd > b.totalUsd ? a : b)
    : null;

  const rpmData = dspSources.map(d => ({
    label: d.platform,
    value: Math.round(d.rpm * 1000),
    color: d.color,
  }));

  return (
    <div className="flex flex-col">
      <Header
        title="DSP Sources"
        subtitle="Revenue per stream · platform breakdown · RPM analysis"
      />

      <div className="p-6 space-y-8">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Streams" value={totalStreams.toLocaleString()}                          icon={<Activity className="w-5 h-5" />}  accent="cyan"    delay={0}    />
          <MetricCard title="Total Revenue" value={`$${totalRev.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`} icon={<DollarSign className="w-5 h-5" />} accent="emerald" delay={0.05} />
          <MetricCard title="Avg RPM"       value={`$${avgRpm}`}                                          icon={<Activity className="w-5 h-5" />}  accent="violet"  delay={0.1}  sublabel="per 1,000 streams" />
          <MetricCard title="Top DSP"       value={topDsp?.platform ?? "—"}                               icon={<Globe className="w-5 h-5" />}     accent="amber"   delay={0.15} sublabel={topDsp ? `$${topDsp.totalUsd.toFixed(0)} revenue` : undefined} />
        </div>

        {dspSources.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground font-mono">No DSP source data yet. Add royalty sources and entries to see your platform breakdown.</p>
          </div>
        ) : (
          <>
            {/* RPM Comparison Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/50 bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground mb-1">RPM by Platform</h2>
                <p className="text-xs text-muted-foreground font-mono mb-4">Revenue per 1,000 streams (USD × 1000)</p>
                <RzBarChart data={rpmData} height={220} formatter={(v) => `$${(v / 1000).toFixed(2)}`} />
              </div>

              <div className="rounded-xl border border-border/50 bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground mb-1">Revenue Distribution</h2>
                <p className="text-xs text-muted-foreground font-mono mb-4">Share of total earnings per DSP</p>
                <div className="space-y-3 mt-2">
                  {dspSources.map((d) => {
                    const pct = totalRev > 0 ? Math.round((d.totalUsd / totalRev) * 100) : 0;
                    return (
                      <div key={d.platform}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-xs text-muted-foreground">{d.platform}</span>
                          </div>
                          <span className="text-xs font-mono font-semibold text-foreground">
                            ${d.totalUsd.toFixed(0)}{" "}
                            <span className="text-muted-foreground">({pct}%)</span>
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/5">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* DSP Detail Table */}
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50">
                <h2 className="text-sm font-semibold text-foreground">Platform Revenue Details</h2>
                <p className="text-xs text-muted-foreground font-mono">YTD earnings, RPM, and territory breakdown</p>
              </div>
              <div className="divide-y divide-border/30">
                {dspSources.map((d) => (
                  <div key={d.platform} className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg border border-border/40 flex items-center justify-center" style={{ backgroundColor: `${d.color}20` }}>
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-sm">{d.platform}</div>
                          <div className="text-xs text-muted-foreground font-mono">{d.payoutModel} · {d.territory}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-foreground">${d.totalUsd.toFixed(0)}</div>
                        <Badge className={`text-[10px] font-mono mt-1 ${d.status === "active" ? "bg-emerald/10 text-emerald border-emerald/20" : "bg-white/5 text-muted-foreground border-white/10"}`}>
                          {d.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                      <div className="p-2.5 rounded-lg bg-white/3 border border-border/20">
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">Streams</p>
                        <p className="text-sm font-bold text-foreground mt-0.5">{d.streams.toLocaleString()}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/3 border border-border/20">
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">RPM</p>
                        <p className="text-sm font-bold text-cyan mt-0.5">${d.rpm.toFixed(2)}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/3 border border-border/20">
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">Revenue</p>
                        <p className="text-sm font-bold text-emerald mt-0.5">${d.totalUsd.toFixed(2)}</p>
                      </div>
                    </div>

                    {d.breakdown.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Territory Breakdown</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border/20">
                                {["Territory", "Streams", "RPM", "Revenue"].map(h => (
                                  <th key={h} className="pb-2 text-left text-[10px] font-mono text-muted-foreground uppercase first:pl-0 last:text-right">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/10">
                              {d.breakdown.map((t) => (
                                <tr key={t.territory}>
                                  <td className="py-1.5 font-mono text-foreground">{t.territory}</td>
                                  <td className="py-1.5 font-mono text-muted-foreground">{t.streams.toLocaleString()}</td>
                                  <td className="py-1.5 font-mono text-cyan">${t.rpm.toFixed(2)}</td>
                                  <td className="py-1.5 font-mono text-foreground text-right">${t.usd.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
