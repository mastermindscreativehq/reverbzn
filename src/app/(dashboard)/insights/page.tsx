export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { InsightCard } from "@/components/dashboard/insight-card";
import { getArtistBySlug, getInsights } from "@/lib/db/queries";
import type { InsightPriority, InsightType } from "@/lib/types";

const ARTIST_SLUG = process.env.ARTIST_SLUG ?? "reverbzn";

const PRIORITY_ORDER: Record<InsightPriority, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

const TYPE_LABELS: Record<InsightType, string> = {
  alert: "Alert", opportunity: "Opportunity", pattern: "Pattern",
  money: "Money", fan: "Fan", content: "Content",
};

export default async function InsightsPage() {
  const artist = await getArtistBySlug(ARTIST_SLUG);
  if (!artist) {
    return (
      <div className="flex flex-col">
        <Header title="Insights" subtitle="No artist found" />
        <div className="p-6">
          <p className="text-sm text-muted-foreground font-mono">Run <code>npm run db:seed</code> first.</p>
        </div>
      </div>
    );
  }

  const all    = await getInsights(artist.id);
  const sorted = [...all].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  const unread   = all.filter(i => !i.isRead).length;
  const critical = all.filter(i => i.priority === "critical").length;
  const byType   = all.reduce<Record<string, number>>((acc, i) => {
    acc[i.type] = (acc[i.type] ?? 0) + 1;
    return acc;
  }, {});
  const topType  = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="flex flex-col">
      <Header title="Insights" subtitle="AI-generated signals and recommended actions" />
      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Insights",  value: all.length,                                           color: "text-cyan" },
            { label: "Unread",          value: unread,                                               color: "text-violet" },
            { label: "Critical",        value: critical,                                             color: "text-destructive" },
            { label: "Top Category",    value: topType ? TYPE_LABELS[topType[0] as InsightType] : "—", color: "text-amber" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border/50 bg-card p-4">
              <p className="text-[10px] font-mono uppercase text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Insights List */}
        <div className="space-y-3">
          {sorted.length === 0 ? (
            <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">No active insights.</p>
            </div>
          ) : (
            sorted.map(insight => <InsightCard key={insight.id} insight={insight} />)
          )}
        </div>

      </div>
    </div>
  );
}
