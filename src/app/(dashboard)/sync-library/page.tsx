export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Music2, Film } from "lucide-react";
import Link from "next/link";
import { getArtistBySlug, getTrackSyncLibrary } from "@/lib/db/queries";

function EnergyBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-white/5">
      <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

export default async function SyncLibraryPage() {
  const slug   = process.env.ARTIST_SLUG ?? "reverbzn";
  const artist = await getArtistBySlug(slug);
  if (!artist) return null;

  const syncTracks = await getTrackSyncLibrary(artist.id);

  const avgSyncScore  = syncTracks.length > 0
    ? Math.round(syncTracks.reduce((s, t) => s + t.syncScore, 0) / syncTracks.length)
    : 0;
  const totalLicensed = syncTracks.reduce((s, t) => s + t.licensedCount, 0);
  const totalPitches  = syncTracks.reduce((s, t) => s + t.pitchCount, 0);

  return (
    <div className="flex flex-col">
      <Header
        title="Sync Library"
        subtitle="Track profiles · mood tagging · cinematic fit scoring"
      />

      <div className="p-6 space-y-6">

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Tracks Available", value: syncTracks.length,     sub: "In sync library",          accent: "cyan"    },
            { label: "Avg Sync Score",   value: `${avgSyncScore}/100`, sub: "Cinematic fit baseline",   accent: "violet"  },
            { label: "Licensed",         value: totalLicensed,          sub: "Tracks with active deals", accent: "emerald" },
            { label: "Active Pitches",   value: totalPitches,           sub: "Submitted pitches",        accent: "amber"   },
          ].map((s, i) => (
            <div key={i} className={`rounded-xl border border-${s.accent}/20 bg-${s.accent}/5 p-4`}>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {syncTracks.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground font-mono">No sync profiles yet. Add track sync data to enable sync library.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {syncTracks.map((track) => (
              <div key={track.trackSlug} className="rounded-xl border border-border/50 bg-card p-5 hover:border-border transition-colors">

                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan/20 to-violet/20 flex items-center justify-center shrink-0">
                      <Music2 className="w-4 h-4 text-cyan" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{track.trackTitle}</p>
                      <p className="text-xs font-mono text-muted-foreground">{(track.genres ?? []).join(", ")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${track.syncScore >= 85 ? "text-emerald" : track.syncScore >= 75 ? "text-cyan" : "text-muted-foreground"}`}>
                      {track.syncScore}
                    </div>
                    <p className="text-[9px] font-mono text-muted-foreground uppercase">SYNC SCORE</p>
                  </div>
                </div>

                {/* Technical Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {track.bpm && (
                    <Badge className="text-[10px] font-mono bg-white/5 text-muted-foreground border-white/10">
                      {track.bpm} BPM
                    </Badge>
                  )}
                  {track.musicalKey && (
                    <Badge className="text-[10px] font-mono bg-white/5 text-muted-foreground border-white/10">
                      {track.musicalKey}
                    </Badge>
                  )}
                  {track.durationSec && (
                    <Badge className="text-[10px] font-mono bg-white/5 text-muted-foreground border-white/10">
                      {Math.floor(track.durationSec / 60)}:{String(track.durationSec % 60).padStart(2, "0")}
                    </Badge>
                  )}
                  {track.hasCleanVersion && (
                    <Badge className="text-[10px] font-mono bg-emerald/10 text-emerald border-emerald/20">Clean</Badge>
                  )}
                  {track.lyricType && (
                    <Badge className={`text-[10px] font-mono ${track.lyricType === "instrumental" ? "bg-violet/10 text-violet border-violet/20" : "bg-white/5 text-muted-foreground border-white/10"}`}>
                      {track.lyricType === "instrumental" ? "Instrumental" : "Vocals"}
                    </Badge>
                  )}
                </div>

                {/* Mood Tags */}
                {track.moods.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {track.moods.map(mood => (
                      <Badge key={mood} className="text-[9px] font-mono bg-cyan/10 text-cyan/80 border-cyan/20">{mood}</Badge>
                    ))}
                  </div>
                )}

                {/* Energy + Cinematic Fit */}
                <div className="space-y-2 mb-3">
                  {track.energyLevel !== null && track.energyLevel !== undefined && (
                    <div>
                      <div className="flex justify-between text-[10px] font-mono mb-1">
                        <span className="text-muted-foreground">Energy</span>
                        <span className="text-foreground">{track.energyLevel}/100</span>
                      </div>
                      <EnergyBar value={track.energyLevel} color="oklch(0.78 0.16 196)" />
                    </div>
                  )}
                  <div>
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-muted-foreground">Cinematic Fit</span>
                      <span className="text-foreground">{track.cinematicFitScore}/100</span>
                    </div>
                    <EnergyBar value={track.cinematicFitScore} color="oklch(0.65 0.22 305)" />
                  </div>
                </div>

                {/* Scene Types */}
                {track.sceneTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {track.sceneTypes.slice(0, 3).map(scene => (
                      <Badge key={scene} className="text-[9px] font-mono bg-amber/10 text-amber/80 border-amber/20">{scene}</Badge>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border/30">
                  <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                    <span>{track.pitchCount} pitch{track.pitchCount !== 1 ? "es" : ""}</span>
                    {track.licensedCount > 0 && (
                      <span className="text-emerald">{track.licensedCount} licensed</span>
                    )}
                  </div>
                  <Link href="/sync-pitches" className="flex items-center gap-1.5 text-xs text-cyan hover:text-cyan/80 font-medium transition-colors">
                    <Film className="w-3 h-3" /> Pitch
                  </Link>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
