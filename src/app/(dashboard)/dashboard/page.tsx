export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { InsightCard } from "@/components/dashboard/insight-card";
import { RzAreaChart } from "@/components/charts/area-chart";
import { RzBarChart } from "@/components/charts/bar-chart";
import {
  getArtistBySlug, getOverviewMetrics, getStreamTrends, getFanTrends,
  getTracks, getPlatformSummaries, getRegionSummaries, getInsights, getNotifications,
} from "@/lib/db/queries";
import { Music2, DollarSign, Users, Activity, Zap, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const ARTIST_SLUG = process.env.ARTIST_SLUG ?? "reverbzn";
const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;

export default async function DashboardPage() {
  const artist = await getArtistBySlug(ARTIST_SLUG);

  if (!artist) {
    return (
      <div className="flex flex-col">
        <Header title="Overview" subtitle="No artist found" />
        <div className="p-6">
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
            <p className="text-sm text-destructive font-mono">
              Artist not found — run <code>npm run db:seed</code> first.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const [metrics, streamData, fanData, allTracks, platforms, regions, allInsights, notifications] =
    await Promise.all([
      getOverviewMetrics(artist.id),
      getStreamTrends(artist.id),
      getFanTrends(artist.id),
      getTracks(artist.id),
      getPlatformSummaries(artist.id),
      getRegionSummaries(artist.id),
      getInsights(artist.id),
      getNotifications(artist.id),
    ]);

  const topTracks   = [...allTracks].sort((a, b) => b.momentumScore - a.momentumScore).slice(0, 5);
  const topRegions  = regions.slice(0, 5);
  const activeInsights  = allInsights.filter(i => !i.isRead).slice(0, 4);
  const recentNotifs    = notifications.filter(n => !n.isRead).slice(0, 4);
  const topActions  = allInsights
    .filter(i => !i.isDismissed && i.recommendedAction)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, 5)
    .map(i => i.recommendedAction!);

  const platformBarData = platforms.map(p => ({
    label: p.platformName,
    value: p.totalStreams,
    color: p.color,
  }));

  const avgOf = (arr: number[]) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
  const catalogComponents = [
    { label: "Avg Momentum",  score: avgOf(allTracks.map(t => t.momentumScore)) },
    { label: "Avg Breakout",  score: avgOf(allTracks.map(t => t.breakoutScore)) },
    { label: "Avg Replay",    score: avgOf(allTracks.map(t => t.replaySignal)) },
    { label: "Avg Retention", score: avgOf(allTracks.map(t => t.retentionProxy)) },
    { label: "Community CVR", score: Math.min(100, Math.round(metrics.communityConversionRate * 10)) },
  ];

  return (
    <div className="flex flex-col">
      <Header
        title="Overview"
        subtitle={`${artist.name} · ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`}
      />

      <div className="p-6 space-y-8">

        {/* ── Top Metrics ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Streams"
            value={metrics.totalStreams.toLocaleString()}
            change={metrics.totalStreamsGrowthPct}
            changeLabel="this week"
            icon={<Music2 className="w-5 h-5" />}
            accent="cyan"
            delay={0}
          />
          <MetricCard
            title="Est. Earnings"
            value={`$${metrics.estimatedEarningsUsd.toLocaleString()}`}
            change={metrics.earningsGrowthPct}
            changeLabel="this week"
            icon={<DollarSign className="w-5 h-5" />}
            accent="emerald"
            delay={0.05}
          />
          <MetricCard
            title="Owned Audience"
            value={metrics.ownedAudienceCount}
            change={metrics.audienceGrowthPct}
            changeLabel="this week"
            icon={<Users className="w-5 h-5" />}
            accent="violet"
            sublabel={`+${metrics.fanGrowthThisWeek} new this week`}
            delay={0.1}
          />
          <MetricCard
            title="Momentum Score"
            value={`${metrics.momentumScore}/100`}
            icon={<Activity className="w-5 h-5" />}
            accent="amber"
            sublabel={`Community CVR: ${metrics.communityConversionRate}%`}
            delay={0.15}
          />
        </div>

        {/* ── Charts Row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Stream Trend</h2>
                <p className="text-xs text-muted-foreground font-mono">Last 12 weeks — all platforms</p>
              </div>
              <Badge className="text-xs font-mono bg-cyan/10 text-cyan border-cyan/20">
                +{metrics.totalStreamsGrowthPct}% WoW
              </Badge>
            </div>
            <RzAreaChart data={streamData} color="oklch(0.78 0.16 196)" label="Streams" height={180} />
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-1">Catalog Breakdown</h2>
            <p className="text-xs text-muted-foreground font-mono mb-4">Avg scores across catalog</p>
            <div className="space-y-3">
              {catalogComponents.map(c => (
                <div key={c.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{c.label}</span>
                    <span className="text-xs font-mono font-semibold text-foreground">{c.score}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan to-violet"
                      style={{ width: `${c.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Overall Score</span>
              <span className="text-2xl font-bold text-cyan">{metrics.momentumScore}</span>
            </div>
          </div>
        </div>

        {/* ── Platform + Fan Growth ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Streams by Platform</h2>
              <Link href="/platforms" className="text-xs text-cyan hover:text-cyan/80 flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <RzBarChart data={platformBarData} height={180} />
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Fan Growth</h2>
                <p className="text-xs text-muted-foreground font-mono">New owned audience weekly</p>
              </div>
              <Link href="/fans" className="text-xs text-cyan hover:text-cyan/80 flex items-center gap-1">
                CRM <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <RzAreaChart data={fanData} color="oklch(0.68 0.22 280)" label="Fans" height={180} />
          </div>
        </div>

        {/* ── Tracks + Regions ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Top Tracks by Momentum</h2>
              <Link href="/tracks" className="text-xs text-cyan hover:text-cyan/80 flex items-center gap-1">
                All tracks <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {topTracks.map((t, i) => (
                <Link key={t.id} href={`/tracks/${t.slug}`}>
                  <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/3 transition-colors group">
                    <div className="w-6 text-center text-xs font-mono text-muted-foreground">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-cyan transition-colors">{t.title}</p>
                      <p className="text-xs text-muted-foreground font-mono">{t.totalPlays.toLocaleString()} plays</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 h-1.5 rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan to-violet" style={{ width: `${t.momentumScore}%` }} />
                      </div>
                      <span className="text-xs font-mono font-semibold text-foreground w-6">{t.momentumScore}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Top Regions</h2>
              <Link href="/regions" className="text-xs text-cyan hover:text-cyan/80 flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {topRegions.map((r, i) => (
                <div key={r.countryCode} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/3 transition-colors">
                  <div className="w-6 text-center text-xs font-mono text-muted-foreground">{i + 1}</div>
                  <span className="text-lg">{r.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{r.country}</p>
                    <p className="text-xs text-muted-foreground font-mono">{r.totalPlays.toLocaleString()} plays</p>
                  </div>
                  <div className={`text-xs font-mono font-semibold ${r.weeklyGrowthPct > 20 ? "text-emerald" : r.weeklyGrowthPct > 10 ? "text-cyan" : "text-muted-foreground"}`}>
                    {r.weeklyGrowthPct > 0 ? "+" : ""}{r.weeklyGrowthPct}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Insights + Actions ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">Active Insights</h2>
                <Badge className="text-xs font-mono bg-cyan/10 text-cyan border-cyan/20">{activeInsights.length}</Badge>
              </div>
              <Link href="/insights" className="text-xs text-cyan hover:text-cyan/80 flex items-center gap-1">
                All insights <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {activeInsights.map(ins => <InsightCard key={ins.id} insight={ins} />)}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-cyan/20 bg-cyan/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-cyan" />
                <h3 className="text-sm font-semibold text-cyan">Next Best Actions</h3>
              </div>
              <ol className="space-y-2">
                {topActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-xs font-mono text-cyan/60 shrink-0 mt-0.5">{i + 1}.</span>
                    <span className="text-xs text-muted-foreground leading-relaxed">{action}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-xl border border-border/50 bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Recent Alerts</h3>
                <Link href="/notifications" className="text-xs text-cyan hover:text-cyan/80">All</Link>
              </div>
              <div className="space-y-2.5">
                {recentNotifs.map(n => (
                  <div key={n.id} className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.priority === "high" ? "bg-amber" : n.priority === "medium" ? "bg-cyan" : "bg-muted-foreground"}`} />
                    <div>
                      <p className="text-xs font-medium text-foreground leading-tight">{n.title}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Key Stats</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Top Platform", value: metrics.topPlatform,                   accent: "text-cyan" },
                  { label: "Top Track",    value: metrics.topTrack,                      accent: "text-violet" },
                  { label: "Top Region",   value: metrics.topRegion,                     accent: "text-emerald" },
                  { label: "CVR",          value: `${metrics.communityConversionRate}%`, accent: "text-amber" },
                ].map(s => (
                  <div key={s.label} className="p-2 rounded-md bg-white/3">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase">{s.label}</p>
                    <p className={`text-sm font-semibold mt-0.5 truncate ${s.accent}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
