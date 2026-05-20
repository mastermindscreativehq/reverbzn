/**
 * Audiomack ingestion service.
 * Uses Audiomack's public oEmbed / stream count endpoints.
 * Writes daily snapshot into platformTrackMetricsDaily.
 */
import { db, schema } from "../lib/db.js";
import { format } from "date-fns";

interface AudiomackStreamData {
  slug:     string;
  plays:    number;
  likes:    number;
  reposts:  number;
}

export async function fetchTrackStats(artistSlug: string, trackSlug: string): Promise<AudiomackStreamData | null> {
  try {
    const url = `https://api.audiomack.com/v1/music/stream/count/${artistSlug}/${trackSlug}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "ReverbZnOS/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json() as { results?: { plays: number; likes: number; reposts: number } };
    if (!data.results) return null;
    return { slug: trackSlug, ...data.results };
  } catch {
    return null;
  }
}

export async function ingestTrackMetrics(
  trackId:     string,
  audiomackData: AudiomackStreamData,
  date = format(new Date(), "yyyy-MM-dd"),
): Promise<void> {
  await db
    .insert(schema.platformTrackMetricsDaily)
    .values({
      trackId,
      platformSlug: "audiomack",
      date,
      streams:   audiomackData.plays,
      listeners: Math.round(audiomackData.plays * 0.7),
      saves:     audiomackData.likes,
    })
    .onConflictDoUpdate({
      target: [
        schema.platformTrackMetricsDaily.trackId,
        schema.platformTrackMetricsDaily.platformSlug,
        schema.platformTrackMetricsDaily.date,
      ],
      set: {
        streams:   audiomackData.plays,
        listeners: Math.round(audiomackData.plays * 0.7),
        saves:     audiomackData.likes,
      },
    });
}
