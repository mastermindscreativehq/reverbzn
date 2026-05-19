export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { getArtistBySlug, getTrackBySlug, getTrackWeeklyTrends, getTrackDailyTrends } from "@/lib/db/queries";
import { RzAreaChart } from "@/components/charts/area-chart";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Music2, TrendingUp, Repeat, Users } from "lucide-react";
import Link from "next/link";

const ARTIST_SLUG = process.env.ARTIST_SLUG ?? "reverbzn";

interface Props { params: Promise<{ id: string }> }

export default async function TrackDetailPage({ params }: Props) {
  const { id } = await params;

  const artist = await getArtistBySlug(ARTIST_SLUG);
  if (!artist) notFound();

  const track = await getTrackBySlug(artist.id, id);
  if (!track) notFound();

  const [weeklyTrends, dailyTrends] = await Promise.all([
    getTrackWeeklyTrends(track.id),
    getTrackDailyTrends(track.id),
  ]);

  const relDate = track.releaseDate ? new Date(track.releaseDate) : null;
  const relDays = relDate ? Math.floor((Date.now() - relDate.getTime()) / 86400000) : null;

  const stats = [
    { label: "Total Plays",   value: track.totalPlays.toLocaleString(),  icon: Music2,     color: "text-cyan" },
    { label: "Total Saves",   value: track.totalSaves.toLocaleString(),   icon: TrendingUp, color: "text-violet" },
    { label: "Total Shares",  value: track.totalShares.toLocaleString(),  icon: Users,      color: "text-emerald" },
    { label: "Replay Signal", value: `${track.replaySignal}/100`,         icon: Repeat,     color: "text-amber" },
  ];

  return (
    <div className="flex flex-col">
      <Header
        title={track.title}
        subtitle={`Track Intelligence · ${relDays !== null ? `Released ${relDays} days ago` : "Release date unknown"}`}
      />
      <div className="p-6 space-y-6">
        <Link href="/tracks" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> All Tracks
        </Link>

        {/* Track Hero */}
        <div className="flex items-start gap-4 p-5 rounded-xl border border-border/50 bg-card">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan/30 to-violet/30 border border-white/10 flex items-center justify-center text-xl font-bold text-foreground shrink-0">
            {track.title.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{track.title}</h1>
              <Badge className="bg-emerald/10 text-emerald border-emerald/20">{track.status}</Badge>
              {track.genres.map(g => (
                <Badge key={g} className="bg-white/5 text-muted-foreground border-white/10 text-[10px]">{g}</Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground font-mono mt-1">
              {relDate
                ? `Released ${relDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
                : "Release date unknown"}
              {track.durationSec
                ? ` · ${Math.floor(track.durationSec / 60)}:${String(track.durationSec % 60).padStart(2, "0")}`
                : ""}
              {track.isrc ? ` · ISRC: ${track.isrc}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {[
              { label: "Momentum", value: track.momentumScore, color: "text-cyan" },
              { label: "Breakout",  value: track.breakoutScore, color: "text-emerald" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl border border-border/50 bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-mono uppercase text-muted-foreground">{s.label}</p>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Weekly Streams</h3>
            <p className="text-xs text-muted-foreground font-mono mb-4">Last 12 weeks</p>
            <RzAreaChart data={weeklyTrends} color="oklch(0.78 0.16 196)" label="Streams" height={200} />
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Daily Streams</h3>
            <p className="text-xs text-muted-foreground font-mono mb-4">Last 30 days</p>
            <RzAreaChart data={dailyTrends} color="oklch(0.68 0.22 280)" label="Streams" height={200} />
          </div>
        </div>

        {/* Score Analysis */}
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Score Analysis</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Momentum Score",  value: track.momentumScore,  desc: "Overall track velocity",    color: "from-cyan to-cyan/50" },
              { label: "Breakout Score",  value: track.breakoutScore,  desc: "Viral potential",           color: "from-emerald to-emerald/50" },
              { label: "Replay Signal",   value: track.replaySignal,   desc: "Repeat listen rate",        color: "from-amber to-amber/50" },
              { label: "Retention Proxy", value: track.retentionProxy, desc: "Full-track completion",     color: "from-violet to-violet/50" },
            ].map(s => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <span className="text-sm font-bold text-foreground">{s.value}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5">
                  <div className={`h-full rounded-full bg-gradient-to-r ${s.color}`} style={{ width: `${s.value}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
