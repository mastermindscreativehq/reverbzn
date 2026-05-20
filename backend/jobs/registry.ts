import type PgBoss from "pg-boss";
import { QUEUE } from "../queues/index.js";
import { env } from "../lib/env.js";
import { db, schema } from "../lib/db.js";
import { eq } from "drizzle-orm";

export async function registerJobs(queue: PgBoss): Promise<void> {
  // Schedule daily metrics ingestion — runs at 06:00 UTC every day
  await queue.schedule(QUEUE.DAILY_METRICS, "0 6 * * *", { artistSlug: env.ARTIST_SLUG });

  // Schedule fan scoring — runs at 07:00 UTC every day
  await queue.schedule(QUEUE.FAN_SCORING, "0 7 * * *", { artistSlug: env.ARTIST_SLUG });

  // Schedule trend detection — runs every 6 hours
  await queue.schedule(QUEUE.TREND_DETECT, "0 */6 * * *", { artistSlug: env.ARTIST_SLUG });

  // Schedule Telegram snapshot — runs hourly
  await queue.schedule(QUEUE.TELEGRAM_SNAP, "0 * * * *", { channelId: env.TELEGRAM_CHANNEL_ID });

  console.log("[jobs] All schedules registered");
}

export async function resolveArtistId(slug: string): Promise<string> {
  const artist = await db.query.artists.findFirst({
    where: eq(schema.artists.slug, slug),
    columns: { id: true },
  });
  if (!artist) throw new Error(`Artist not found: ${slug}`);
  return artist.id;
}
