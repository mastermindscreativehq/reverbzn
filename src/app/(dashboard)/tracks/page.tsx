export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { getArtistBySlug, getTracks } from "@/lib/db/queries";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowUpRight, TrendingUp } from "lucide-react";

const ARTIST_SLUG = process.env.ARTIST_SLUG ?? "reverbzn";

function ScoreBar({ value, color = "cyan" }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-white/5">
        <div className={`h-full rounded-full bg-${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-mono text-foreground w-6">{value}</span>
    </div>
  );
}

export default async function TracksPage() {
  const artist = await getArtistBySlug(ARTIST_SLUG);
  if (!artist) {
    return (
      <div className="flex flex-col">
        <Header title="Track Intelligence" subtitle="No artist found" />
        <div className="p-6">
          <p className="text-sm text-muted-foreground font-mono">Run <code>npm run db:seed</code> first.</p>
        </div>
      </div>
    );
  }

  const tracks = await getTracks(artist.id);
  const sorted = [...tracks].sort((a, b) => b.totalPlays - a.totalPlays);

  return (
    <div className="flex flex-col">
      <Header
        title="Track Intelligence"
        subtitle={`${sorted.length} tracks · performance & momentum analysis`}
      />
      <div className="p-6">
        {sorted.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No tracks found.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    {["#", "Track", "Released", "Plays", "Saves", "Momentum", "Breakout", "Replay", "Retention", "Status", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((track, i) => {
                    const relDate = track.releaseDate ? new Date(track.releaseDate) : null;
                    const relDays = relDate ? Math.floor((Date.now() - relDate.getTime()) / 86400000) : null;
                    const isNew = relDays !== null && relDays < 45;
                    const isBreakout = track.breakoutScore >= 85;
                    return (
                      <tr key={track.id} className="border-b border-border/30 hover:bg-white/2 transition-colors group">
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-cyan/20 to-violet/20 border border-white/5 flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                              {track.title.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <Link href={`/tracks/${track.slug}`} className="font-medium text-foreground group-hover:text-cyan transition-colors flex items-center gap-1">
                                {track.title}
                                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Link>
                              <p className="text-[10px] text-muted-foreground font-mono">{track.genres.join(", ")}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {relDate
                            ? relDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })
                            : "—"}
                          {isNew && <Badge className="ml-1.5 text-[9px] h-4 bg-cyan/10 text-cyan border-cyan/20">NEW</Badge>}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono font-medium text-foreground">{track.totalPlays.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{track.totalSaves.toLocaleString()}</td>
                        <td className="px-4 py-3"><ScoreBar value={track.momentumScore} color="cyan" /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {isBreakout && <TrendingUp className="w-3.5 h-3.5 text-emerald" />}
                            <ScoreBar value={track.breakoutScore} color={isBreakout ? "emerald" : "violet"} />
                          </div>
                        </td>
                        <td className="px-4 py-3"><ScoreBar value={track.replaySignal} color="amber" /></td>
                        <td className="px-4 py-3"><ScoreBar value={track.retentionProxy} color="violet" /></td>
                        <td className="px-4 py-3">
                          <Badge className={`text-[10px] ${track.status === "released" ? "bg-emerald/10 text-emerald border-emerald/20" : "bg-muted text-muted-foreground"}`}>
                            {track.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/tracks/${track.slug}`} className="text-xs text-muted-foreground hover:text-cyan transition-colors font-mono">
                            Detail →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
