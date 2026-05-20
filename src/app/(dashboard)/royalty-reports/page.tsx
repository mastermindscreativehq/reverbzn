export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, FileText, TrendingUp, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { getArtistBySlug, getRoyaltyReportHistory } from "@/lib/db/queries";

const statusConfig: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
  paid:       { label: "Paid",       class: "bg-emerald/10 text-emerald border-emerald/20",       icon: <CheckCircle2 className="w-3 h-3" /> },
  confirmed:  { label: "Confirmed",  class: "bg-cyan/10 text-cyan border-cyan/20",                 icon: <CheckCircle2 className="w-3 h-3" /> },
  processing: { label: "Processing", class: "bg-amber/10 text-amber border-amber/20",               icon: <Clock className="w-3 h-3" /> },
  draft:      { label: "Draft",      class: "bg-white/5 text-muted-foreground border-white/10",    icon: <FileText className="w-3 h-3" /> },
};

export default async function RoyaltyReportsPage() {
  const slug   = process.env.ARTIST_SLUG ?? "reverbzn";
  const artist = await getArtistBySlug(slug);
  if (!artist) return null;

  const reports = await getRoyaltyReportHistory(artist.id);

  const ytdTotal   = reports.reduce((s, r) => s + Number(r.totalUsd), 0);
  const paidTotal  = reports.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.totalUsd), 0);
  const pending    = reports.filter(r => r.status !== "paid").reduce((s, r) => s + Number(r.totalUsd), 0);
  const avgMonthly = reports.length > 0 ? ytdTotal / reports.length : 0;

  const bestMonth  = reports.reduce((best, r) => Number(r.totalUsd) > Number(best?.totalUsd ?? 0) ? r : best, reports[0]);

  const topTrackCounts = new Map<string, number>();
  for (const r of reports) {
    if (r.topTrackTitle) topTrackCounts.set(r.topTrackTitle, (topTrackCounts.get(r.topTrackTitle) ?? 0) + 1);
  }
  const topConsistentTrack = [...topTrackCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const firstTotal = Number(reports[0]?.totalUsd ?? 0);
  const lastTotal  = Number(reports[reports.length - 1]?.totalUsd ?? 0);
  const overallGrowth = firstTotal > 0 ? Math.round(((lastTotal - firstTotal) / firstTotal) * 100) : 0;

  const reportsWithMom = reports.map((r, i) => {
    const prev = reports[i - 1];
    const mom  = prev ? Math.round(((Number(r.totalUsd) - Number(prev.totalUsd)) / Number(prev.totalUsd)) * 100) : null;
    return { ...r, mom };
  });

  return (
    <div className="flex flex-col">
      <Header
        title="Royalty Reports"
        subtitle="Monthly payout history · confirmed earnings · distribution statements"
      />

      <div className="p-6 space-y-8">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="YTD Total"     value={`$${ytdTotal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`}    icon={<DollarSign className="w-5 h-5" />}    accent="emerald" delay={0}    />
          <MetricCard title="Paid Out"      value={`$${paidTotal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`}   icon={<CheckCircle2 className="w-5 h-5" />}  accent="cyan"    delay={0.05} />
          <MetricCard title="Pending"       value={`$${pending.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`}     icon={<Clock className="w-5 h-5" />}         accent="amber"   delay={0.1}  sublabel={`${reports.filter(r => r.status !== "paid").length} statements pending`} />
          <MetricCard title="Avg Monthly"   value={`$${avgMonthly.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`}  icon={<TrendingUp className="w-5 h-5" />}    accent="violet"  delay={0.15} />
        </div>

        {/* Reports Table */}
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Statement History</h2>
              <p className="text-xs text-muted-foreground font-mono">All monthly royalty statements</p>
            </div>
            <Badge className="text-xs font-mono bg-white/5 text-muted-foreground border-white/10">
              {reports.length} reports
            </Badge>
          </div>

          {reports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30 bg-white/2">
                    {["Period", "Total", "MoM", "Top Platform", "Top Track", "Entries", "Status", ""].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase tracking-wider last:w-8">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {reportsWithMom.map((r) => {
                    const sc = statusConfig[r.status] ?? statusConfig.draft;
                    return (
                      <tr key={r.id} className="hover:bg-white/2 transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-foreground text-sm">{r.periodLabel}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{r.periodStart} → {r.periodEnd}</div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="font-bold text-foreground text-sm">${Number(r.totalUsd).toFixed(2)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs">
                          {r.mom === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className={r.mom > 0 ? "text-emerald" : "text-destructive"}>
                              {r.mom > 0 ? "+" : ""}{r.mom}%
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">{r.topPlatform ?? "—"}</td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground truncate max-w-[160px]">{r.topTrackTitle ?? "—"}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs text-muted-foreground">{r.entryCount}</td>
                        <td className="px-5 py-3.5">
                          <Badge className={`text-[10px] font-mono flex items-center gap-1 w-fit ${sc.class}`}>
                            {sc.icon}
                            {sc.label}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-cyan transition-colors" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-8 text-xs text-muted-foreground font-mono">No royalty reports yet.</p>
          )}
        </div>

        {/* Summary cards */}
        {reports.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Best Month</h3>
              <p className="text-2xl font-bold text-emerald">${Number(bestMonth?.totalUsd ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">{bestMonth?.periodLabel}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Consistent Earner</h3>
              <p className="text-2xl font-bold text-cyan">{topConsistentTrack?.[0] ?? "—"}</p>
              {topConsistentTrack && (
                <p className="text-xs text-muted-foreground font-mono mt-1">Top track in {topConsistentTrack[1]} of {reports.length} months</p>
              )}
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Growth Trajectory</h3>
              <p className={`text-2xl font-bold ${overallGrowth >= 0 ? "text-violet" : "text-destructive"}`}>
                {overallGrowth >= 0 ? "+" : ""}{overallGrowth}%
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {reports[0]?.periodLabel} → {reports[reports.length - 1]?.periodLabel}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
