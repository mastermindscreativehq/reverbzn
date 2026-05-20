export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RzAreaChart } from "@/components/charts/area-chart";
import { RzBarChart } from "@/components/charts/bar-chart";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, TrendingUp, AlertTriangle, Zap,
  ArrowRight, Activity, Globe, Music2,
} from "lucide-react";
import Link from "next/link";
import {
  getArtistBySlug,
  getRoyaltyReportHistory,
  getRoyaltyByPlatform,
  getTopEarningTracks,
  getRoyaltyByTerritory,
  getPayoutForecasts,
  getRoyaltySources,
  getInsights,
} from "@/lib/db/queries";

export default async function RoyaltiesPage() {
  const slug   = process.env.ARTIST_SLUG ?? "reverbzn";
  const artist = await getArtistBySlug(slug);
  if (!artist) return null;

  const [reports, dspBreakdown, topTracks, countryEarnings, forecasts, sources, allInsights] =
    await Promise.all([
      getRoyaltyReportHistory(artist.id),
      getRoyaltyByPlatform(artist.id),
      getTopEarningTracks(artist.id),
      getRoyaltyByTerritory(artist.id),
      getPayoutForecasts(artist.id),
      getRoyaltySources(artist.id),
      getInsights(artist.id),
    ]);

  const monthlyTrend = reports.map(r => ({ date: r.periodLabel, value: Number(r.totalUsd) }));
  const totalRevenue = Math.round(reports.reduce((s, r) => s + Number(r.totalUsd), 0));
  const thisMonth    = Math.round(Number(reports[reports.length - 1]?.totalUsd ?? 0));
  const pending      = Math.round(
    reports.filter(r => r.status === "processing" || r.status === "confirmed")
      .reduce((s, r) => s + Number(r.totalUsd), 0)
  );
  const avgRpm = sources.length > 0
    ? Math.round(sources.reduce((s, src) => s + Number(src.rpm), 0) / sources.length * 100) / 100
    : 0;

  const prevMonthTotal = Number(reports[reports.length - 2]?.totalUsd ?? 0);
  const momChange      = prevMonthTotal > 0
    ? Math.round(((thisMonth - prevMonthTotal) / prevMonthTotal) * 100)
    : 0;

  const aiRecommendations = allInsights
    .filter(i => i.type === "money" || i.type === "opportunity")
    .slice(0, 4)
    .map(i => ({ icon: "💡", text: i.message }));

  const leakageInsights = allInsights
    .filter(i => i.type === "alert" && (i.priority === "critical" || i.priority === "high"))
    .slice(0, 4)
    .map(i => ({
      label:    i.title,
      impact:   0,
      severity: i.priority as string,
    }));

  return (
    <div className="flex flex-col">
      <Header
        title="Royalties"
        subtitle="Revenue intelligence · earnings analysis · payout forecasting"
      />

      <div className="p-6 space-y-8">

        {/* ── KPI Cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Royalties (YTD)"
            value={`$${totalRevenue.toLocaleString()}`}
            icon={<DollarSign className="w-5 h-5" />}
            accent="emerald"
            delay={0}
          />
          <MetricCard
            title="This Month"
            value={`$${thisMonth.toLocaleString()}`}
            change={momChange}
            changeLabel="vs last month"
            icon={<TrendingUp className="w-5 h-5" />}
            accent="cyan"
            delay={0.05}
          />
          <MetricCard
            title="Avg RPM"
            value={`$${avgRpm}`}
            icon={<Activity className="w-5 h-5" />}
            accent="violet"
            sublabel="per 1,000 streams"
            delay={0.1}
          />
          <MetricCard
            title="Pending Payouts"
            value={`$${pending.toLocaleString()}`}
            icon={<DollarSign className="w-5 h-5" />}
            accent="amber"
            sublabel="Processing / Confirmed"
            delay={0.15}
          />
        </div>

        {/* ── Revenue Trend + DSP Split ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Monthly Revenue Trend</h2>
                <p className="text-xs text-muted-foreground font-mono">All DSPs combined</p>
              </div>
              {monthlyTrend.length > 1 && (
                <Badge className="text-xs font-mono bg-emerald/10 text-emerald border-emerald/20">
                  {momChange >= 0 ? "+" : ""}{momChange}% MoM
                </Badge>
              )}
            </div>
            {monthlyTrend.length > 0 ? (
              <RzAreaChart
                data={monthlyTrend}
                color="oklch(0.75 0.18 160)"
                label="Revenue (USD)"
                height={180}
                formatter={(v) => `$${v.toLocaleString()}`}
              />
            ) : (
              <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground font-mono">
                No revenue data yet
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-1">Revenue by DSP</h2>
            <p className="text-xs text-muted-foreground font-mono mb-4">All-time distribution</p>
            {dspBreakdown.length > 0 ? (
              <div className="space-y-3">
                {dspBreakdown.map((dsp) => {
                  const total = dspBreakdown.reduce((s, d) => s + d.value, 0);
                  const pct   = total > 0 ? Math.round((dsp.value / total) * 100) : 0;
                  return (
                    <div key={dsp.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{dsp.label}</span>
                        <span className="text-xs font-mono font-semibold text-foreground">
                          ${dsp.value.toLocaleString()}{" "}
                          <span className="text-muted-foreground">({pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/5">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: dsp.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-mono">No DSP data yet</p>
            )}
            <div className="mt-4 pt-3 border-t border-border/50">
              <Link href="/royalty-sources" className="text-xs text-cyan hover:text-cyan/80 flex items-center gap-1">
                RPM breakdown <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Top Earning Tracks ────────────────────────────────── */}
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Top Earning Tracks</h2>
              <p className="text-xs text-muted-foreground font-mono">YTD royalty revenue per track</p>
            </div>
            <Link href="/tracks" className="text-xs text-cyan hover:text-cyan/80 flex items-center gap-1">
              All tracks <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {topTracks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    {["#", "Track", "Streams", "RPM", "Royalties", "Top DSP"].map(h => (
                      <th key={h} className="text-left pb-3 text-xs font-mono text-muted-foreground uppercase tracking-wider last:text-right">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {topTracks.map((t, i) => (
                    <tr key={t.title} className="hover:bg-white/2 transition-colors">
                      <td className="py-3 text-xs font-mono text-muted-foreground w-8">{i + 1}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-cyan/20 to-violet/20 flex items-center justify-center shrink-0">
                            <Music2 className="w-3.5 h-3.5 text-cyan" />
                          </div>
                          <span className="font-medium text-foreground">{t.title}</span>
                        </div>
                      </td>
                      <td className="py-3 text-right font-mono text-xs text-muted-foreground">{t.plays.toLocaleString()}</td>
                      <td className="py-3 text-right font-mono text-xs">
                        <span className={t.rpm >= 3.5 ? "text-emerald" : t.rpm >= 3.0 ? "text-cyan" : "text-muted-foreground"}>
                          ${t.rpm.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono text-sm font-semibold text-foreground">
                        ${t.earnings.toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <Badge className="text-[10px] font-mono bg-white/5 text-muted-foreground border-white/10">
                          {t.platform}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground font-mono py-4">No royalty entries recorded yet.</p>
          )}
        </div>

        {/* ── Country Earnings + Leakage/Alerts ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Earnings by Country</h2>
              <Link href="/regions" className="text-xs text-cyan hover:text-cyan/80 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Regions
              </Link>
            </div>
            {countryEarnings.length > 0 ? (
              <RzBarChart data={countryEarnings} height={200} formatter={(v) => `$${v.toLocaleString()}`} horizontal />
            ) : (
              <p className="text-xs text-muted-foreground font-mono">No territory data yet</p>
            )}
          </div>

          {leakageInsights.length > 0 ? (
            <div className="rounded-xl border border-amber/20 bg-amber/5 p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber" />
                <h2 className="text-sm font-semibold text-amber">Revenue Alerts</h2>
              </div>
              <div className="space-y-3">
                {leakageInsights.map((l, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-black/20 border border-border/30">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      l.severity === "critical" ? "bg-destructive animate-pulse" :
                      l.severity === "high" ? "bg-amber" : "bg-muted-foreground"
                    }`} />
                    <p className="text-xs font-medium text-foreground leading-tight">{l.label}</p>
                    <Badge className={`text-[10px] font-mono shrink-0 ${
                      l.severity === "critical" ? "bg-destructive/20 text-destructive border-destructive/30" :
                      l.severity === "high" ? "bg-amber/20 text-amber border-amber/30" :
                      "bg-white/5 text-muted-foreground border-white/10"
                    }`}>
                      {l.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald/20 bg-emerald/5 p-5 flex items-center gap-3">
              <Zap className="w-5 h-5 text-emerald shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald">No Revenue Alerts</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">All revenue streams look healthy.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── AI Recommendations ───────────────────────────────── */}
        {aiRecommendations.length > 0 && (
          <div className="rounded-xl border border-cyan/20 bg-cyan/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-cyan" />
              <h2 className="text-sm font-semibold text-cyan">AI Revenue Recommendations</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {aiRecommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-black/20 border border-border/30">
                  <span className="text-lg shrink-0">{r.icon}</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Payout Forecast ───────────────────────────────────── */}
        {forecasts.length > 0 && (
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Payout Forecast</h2>
                <p className="text-xs text-muted-foreground font-mono">Projected monthly earnings — next {forecasts.length} months</p>
              </div>
              <Badge className="text-xs font-mono bg-violet/10 text-violet border-violet/20">AI Forecast</Badge>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {forecasts.map((f) => (
                <div key={f.periodLabel} className="p-4 rounded-lg bg-white/3 border border-border/30">
                  <p className="text-xs font-mono text-muted-foreground mb-2">{f.periodLabel}</p>
                  <p className="text-2xl font-bold text-foreground">${Number(f.forecastUsd).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    ${Number(f.lowUsd).toLocaleString()} — ${Number(f.highUsd).toLocaleString()}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="flex-1 h-1 rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan to-violet" style={{ width: `${f.confidencePct}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{f.confidencePct}% conf.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
