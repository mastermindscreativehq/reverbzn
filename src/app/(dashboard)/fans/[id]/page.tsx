export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { getArtistBySlug, getFanById, getFanEvents } from "@/lib/db/queries";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, MessageCircle, Phone, Music2, Globe } from "lucide-react";
import Link from "next/link";

const ARTIST_SLUG = process.env.ARTIST_SLUG ?? "reverbzn";

interface Props { params: Promise<{ id: string }> }

const EVENT_LABEL: Record<string, string> = {
  song_played:         "Played a song",
  full_track_listened: "Listened to full track",
  song_saved:          "Saved a song",
  song_shared:         "Shared a song",
  smart_link_clicked:  "Clicked smart link",
  email_opted_in:      "Opted into email",
  telegram_joined:     "Joined Telegram",
  whatsapp_joined:     "Joined WhatsApp",
  campaign_clicked:    "Clicked campaign",
  content_viewed:      "Viewed content",
  content_converted:   "Content conversion",
};

const CHANNEL_COLOR: Record<string, string> = {
  email:    "text-cyan",
  telegram: "text-violet",
  whatsapp: "text-emerald",
};

export default async function FanDetailPage({ params }: Props) {
  const { id } = await params;

  const artist = await getArtistBySlug(ARTIST_SLUG);
  if (!artist) notFound();

  const [fan, events] = await Promise.all([
    getFanById(id),
    getFanEvents(artist.id, id),
  ]);
  if (!fan) notFound();

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  return (
    <div className="flex flex-col">
      <Header title={fan.displayName} subtitle="Fan profile · event history" />
      <div className="p-6 space-y-6">
        <Link href="/fans" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> All Fans
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Profile */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan/40 to-violet/40 border border-white/10 flex items-center justify-center text-base font-bold text-foreground">
                  {fan.displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">{fan.displayName}</h2>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Globe className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {fan.city ? `${fan.city}, ` : ""}{fan.country ?? "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {fan.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-cyan" />
                    <span className="text-xs text-muted-foreground font-mono">{fan.email}</span>
                  </div>
                )}
                {fan.telegramId && (
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-3.5 h-3.5 text-violet" />
                    <span className="text-xs text-muted-foreground font-mono">{fan.telegramId}</span>
                  </div>
                )}
                {fan.whatsappPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald" />
                    <span className="text-xs text-muted-foreground font-mono">{fan.whatsappPhone}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Engagement</p>
                  <p className="text-xl font-bold text-cyan">{fan.engagementScore}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Superfan</p>
                  <p className="text-xl font-bold text-violet">{fan.superfanScore}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Joined</p>
                  <p className="text-xs text-foreground">{new Date(fan.joinedAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Last Active</p>
                  <p className="text-xs text-foreground">{new Date(fan.lastActiveAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {fan.channels.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card p-4">
                <h3 className="text-xs font-mono uppercase text-muted-foreground mb-3">Channels</h3>
                <div className="flex flex-wrap gap-2">
                  {fan.channels.map((c: string) => (
                    <Badge key={c} className={`capitalize text-xs ${CHANNEL_COLOR[c] ?? "text-muted-foreground"} bg-white/5 border-white/10`}>
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {fan.favoriteTrack && (
              <div className="rounded-xl border border-border/50 bg-card p-4">
                <h3 className="text-xs font-mono uppercase text-muted-foreground mb-2">Favorite Track</h3>
                <div className="flex items-center gap-2">
                  <Music2 className="w-4 h-4 text-cyan" />
                  <span className="text-sm font-medium text-foreground">{fan.favoriteTrack.title}</span>
                </div>
              </div>
            )}

            {fan.tags.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card p-4">
                <h3 className="text-xs font-mono uppercase text-muted-foreground mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {fan.tags.map((t: string) => (
                    <Badge key={t} className="text-[10px] bg-white/5 text-muted-foreground border-white/10">{t}</Badge>
                  ))}
                </div>
              </div>
            )}

            {fan.notes && (
              <div className="rounded-xl border border-border/50 bg-card p-4">
                <h3 className="text-xs font-mono uppercase text-muted-foreground mb-2">Notes</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{fan.notes}</p>
              </div>
            )}
          </div>

          {/* Event History */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50">
                <h2 className="text-sm font-semibold text-foreground">Event History</h2>
                <p className="text-xs text-muted-foreground font-mono">{sortedEvents.length} events recorded</p>
              </div>
              {sortedEvents.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">No events recorded yet.</p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {sortedEvents.map(e => (
                    <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/2 transition-colors">
                      <div className="w-2 h-2 rounded-full bg-cyan/60 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{EVENT_LABEL[e.eventType] ?? e.eventType}</p>
                        {e.track && (
                          <p className="text-xs text-muted-foreground font-mono">Track: {e.track.title}</p>
                        )}
                        {e.platformSlug && (
                          <p className="text-xs text-muted-foreground font-mono capitalize">{e.platformSlug.replace("_", " ")}</p>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(e.occurredAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
