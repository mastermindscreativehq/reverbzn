import { db, schema } from "../lib/db.js";
import { eq, desc, gte, and, sql } from "drizzle-orm";
import { subDays, format } from "date-fns";

export interface TrendSignal {
  trackId:    string;
  trackTitle: string;
  signal:     "breakout" | "decay" | "revival" | "stable";
  magnitude:  number;
  weekOverWeekPct: number;
}

export async function detectTrends(artistId: string): Promise<TrendSignal[]> {
  const tracks = await db.query.tracks.findMany({
    where: eq(schema.tracks.artistId, artistId),
    columns: { id: true, title: true },
  });

  const signals: TrendSignal[] = [];

  for (const track of tracks) {
    const metrics = await db
      .select({
        date:    schema.platformTrackMetricsDaily.date,
        streams: sql<number>`sum(${schema.platformTrackMetricsDaily.streams})`,
      })
      .from(schema.platformTrackMetricsDaily)
      .where(and(
        eq(schema.platformTrackMetricsDaily.trackId, track.id),
        gte(schema.platformTrackMetricsDaily.date, format(subDays(new Date(), 14), "yyyy-MM-dd")),
      ))
      .groupBy(schema.platformTrackMetricsDaily.date)
      .orderBy(desc(schema.platformTrackMetricsDaily.date));

    if (metrics.length < 7) continue;

    const thisWeek = metrics.slice(0, 7).reduce((s, r) => s + Number(r.streams), 0);
    const lastWeek = metrics.slice(7, 14).reduce((s, r) => s + Number(r.streams), 0);

    if (lastWeek === 0) continue;

    const weekOverWeekPct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

    let signal: TrendSignal["signal"] = "stable";
    if (weekOverWeekPct >= 40)       signal = "breakout";
    else if (weekOverWeekPct <= -25) signal = "decay";
    else if (weekOverWeekPct >= 15 && lastWeek < 5000) signal = "revival";

    signals.push({
      trackId:    track.id,
      trackTitle: track.title,
      signal,
      magnitude:  Math.abs(weekOverWeekPct),
      weekOverWeekPct,
    });
  }

  return signals.sort((a, b) => b.magnitude - a.magnitude);
}

export async function writeInsights(artistId: string, signals: TrendSignal[]): Promise<void> {
  const actionable = signals.filter(s => s.signal !== "stable");

  for (const s of actionable) {
    const isBreakout = s.signal === "breakout";
    const isDecay    = s.signal === "decay";

    await db
      .insert(schema.insights)
      .values({
        artistId,
        type:     isBreakout ? "opportunity" : isDecay ? "alert" : "pattern",
        priority: isBreakout || (isDecay && s.magnitude > 40) ? "high" : "medium",
        title: isBreakout
          ? `Breakout detected — ${s.trackTitle}`
          : isDecay
            ? `Stream decay warning — ${s.trackTitle}`
            : `Revival signal — ${s.trackTitle}`,
        message: isBreakout
          ? `${s.trackTitle} is up ${s.weekOverWeekPct}% week-over-week. Increase playlist push and social promotion now.`
          : isDecay
            ? `${s.trackTitle} has dropped ${Math.abs(s.weekOverWeekPct)}% week-over-week. Consider a re-promotion campaign.`
            : `${s.trackTitle} is showing revival momentum (+${s.weekOverWeekPct}% WoW). Push it back to playlists.`,
      })
      .onConflictDoNothing();
  }
}
