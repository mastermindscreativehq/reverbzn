export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { getArtistBySlug, getSmartLinks } from "@/lib/db/queries";
import { Badge } from "@/components/ui/badge";
import { Link2, ExternalLink, TrendingUp } from "lucide-react";

const ARTIST_SLUG = process.env.ARTIST_SLUG ?? "reverbzn";

const platformLabels: Record<string, string> = {
  spotify: "Spotify", apple_music: "Apple Music",
  audiomack: "Audiomack", boomplay: "Boomplay",
  youtube: "YouTube", soundcloud: "SoundCloud",
};

type PlatformLink = { platformSlug: string; url: string };

export default async function SmartLinksPage() {
  const artist = await getArtistBySlug(ARTIST_SLUG);
  if (!artist) {
    return (
      <div className="flex flex-col">
        <Header title="Smart Links" subtitle="No artist found" />
        <div className="p-6">
          <p className="text-sm text-muted-foreground font-mono">Run <code>npm run db:seed</code> first.</p>
        </div>
      </div>
    );
  }

  const links = await getSmartLinks(artist.id);
  const totalClicks = links.reduce((a, l) => a + l.totalClicks, 0);
  const totalConversions = links.reduce((a, l) => a + l.totalConversions, 0);
  const avgCvr = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0";

  return (
    <div className="flex flex-col">
      <Header title="Smart Links" subtitle="Branded links with conversion tracking" />
      <div className="p-6 space-y-6">

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Links",   value: links.length,                color: "text-cyan" },
            { label: "Total Clicks",  value: totalClicks.toLocaleString(), color: "text-violet" },
            { label: "Avg. CVR",      value: `${avgCvr}%`,                color: "text-emerald" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border/50 bg-card p-4">
              <p className="text-[10px] font-mono uppercase text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {links.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No smart links yet. Run <code>npm run db:seed</code> to populate.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {links.map(link => {
              const platformLinks = (link.platformLinks ?? []) as PlatformLink[];
              const cvr = parseFloat(String(link.conversionRate));

              return (
                <div key={link.id} className="rounded-xl border border-border/50 bg-card p-5 hover:border-white/20 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-cyan shrink-0" />
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{link.title}</h3>
                        {link.externalUrl && (
                          <p className="text-[10px] font-mono text-muted-foreground truncate max-w-[200px]">{link.externalUrl}</p>
                        )}
                      </div>
                    </div>
                    <Badge className={link.isActive ? "bg-emerald/10 text-emerald border-emerald/20 text-[10px]" : "bg-white/5 text-muted-foreground border-white/10 text-[10px]"}>
                      {link.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase">Clicks</p>
                      <p className="text-lg font-bold text-foreground">{link.totalClicks.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase">Conversions</p>
                      <p className="text-lg font-bold text-violet">{link.totalConversions.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase">CVR</p>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald" />
                        <p className="text-lg font-bold text-emerald">{cvr.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>

                  {platformLinks.length > 0 && (
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">Platforms</p>
                      <div className="flex flex-wrap gap-1.5">
                        {platformLinks.map(p => (
                          <a key={p.platformSlug} href={p.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors border border-border/50 rounded px-1.5 py-0.5 hover:border-white/20">
                            {platformLabels[p.platformSlug] ?? p.platformSlug}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] font-mono text-muted-foreground mt-3">
                    Created {new Date(link.createdAt).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
