export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { getArtistBySlug, getRegionSummaries } from "@/lib/db/queries";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MapPin } from "lucide-react";

const ARTIST_SLUG = process.env.ARTIST_SLUG ?? "reverbzn";

export default async function RegionsPage() {
  const artist = await getArtistBySlug(ARTIST_SLUG);
  if (!artist) {
    return (
      <div className="flex flex-col">
        <Header title="Geo / Region Analytics" subtitle="No artist found" />
        <div className="p-6">
          <p className="text-sm text-muted-foreground font-mono">Run <code>npm run db:seed</code> first.</p>
        </div>
      </div>
    );
  }

  const regions = await getRegionSummaries(artist.id);
  const sorted  = [...regions].sort((a, b) => b.totalPlays - a.totalPlays);

  return (
    <div className="flex flex-col">
      <Header
        title="Geo / Region Analytics"
        subtitle={`Audience distribution across ${sorted.length} countries`}
      />
      <div className="p-6 space-y-6">

        {sorted.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No region data yet.</p>
          </div>
        ) : (
          <>
            {/* Top 3 Hero Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {sorted.slice(0, 3).map((r, i) => (
                <div key={r.countryCode} className={`rounded-xl border bg-card p-5 ${i === 0 ? "border-cyan/30" : "border-border/50"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{r.flag}</span>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{r.country}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <TrendingUp className="w-3 h-3 text-emerald" />
                          <span className="text-xs font-mono text-emerald font-semibold">
                            {r.weeklyGrowthPct > 0 ? "+" : ""}{r.weeklyGrowthPct}% WoW
                          </span>
                        </div>
                      </div>
                    </div>
                    {i === 0 && <Badge className="bg-cyan/10 text-cyan border-cyan/20 text-[10px]">#1 MARKET</Badge>}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase">Total Plays</p>
                      <p className="text-base font-bold text-foreground">{(r.totalPlays / 1000).toFixed(0)}K</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase">Listeners</p>
                      <p className="text-base font-bold text-foreground">{(r.totalListeners / 1000).toFixed(0)}K</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap mt-2">
                    {r.topCities.slice(0, 3).map(c => (
                      <span key={c} className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <MapPin className="w-2.5 h-2.5" />{c}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Full Table */}
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50">
                <h2 className="text-sm font-semibold text-foreground">All Regions</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      {["#", "Country", "Total Plays", "Listeners", "WoW Growth", "Breakout", "Top Cities"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((r, i) => (
                      <tr key={r.countryCode} className="border-b border-border/20 hover:bg-white/2 transition-colors">
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{r.flag}</span>
                            <span className="font-medium text-foreground">{r.country}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-foreground">{r.totalPlays.toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{r.totalListeners.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <Badge className={`text-[10px] font-mono ${r.weeklyGrowthPct >= 20 ? "bg-emerald/10 text-emerald border-emerald/20" : r.weeklyGrowthPct >= 10 ? "bg-cyan/10 text-cyan border-cyan/20" : "bg-white/5 text-muted-foreground border-white/10"}`}>
                            {r.weeklyGrowthPct > 0 ? "+" : ""}{r.weeklyGrowthPct}%
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-14 h-1.5 rounded-full bg-white/5">
                              <div className={`h-full rounded-full ${r.breakoutScore >= 80 ? "bg-emerald" : "bg-cyan"}`} style={{ width: `${r.breakoutScore}%` }} />
                            </div>
                            <span className="text-xs font-mono">{r.breakoutScore}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {r.topCities.map(c => (
                              <span key={c} className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                <MapPin className="w-2.5 h-2.5" />{c}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
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
