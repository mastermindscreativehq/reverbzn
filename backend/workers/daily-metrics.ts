import type PgBoss from "pg-boss";
import { QUEUE } from "../queues/index.js";
import { resolveArtistId } from "../jobs/registry.js";
import { snapshotChannel } from "../services/telegram.js";
import { db, schema } from "../lib/db.js";
import { eq } from "drizzle-orm";
import { format } from "date-fns";

interface DailyMetricsPayload { artistSlug: string }

export function registerDailyMetricsWorker(queue: PgBoss): void {
  queue.work<DailyMetricsPayload>(QUEUE.DAILY_METRICS, { batchSize: 1 }, async ([job]) => {
    const { artistSlug } = job.data;
    console.log(`[daily-metrics] Starting for ${artistSlug}`);

    const artistId = await resolveArtistId(artistSlug);

    // Telegram member count snapshot
    try {
      const snap = await snapshotChannel();
      console.log(`[daily-metrics] Telegram members: ${snap.memberCount}`);
    } catch (err) {
      console.warn("[daily-metrics] Telegram snapshot failed:", err);
    }

    // TODO: Spotify metrics ingestion (requires Spotify for Artists API)
    // TODO: Audiomack metrics ingestion
    // TODO: YouTube Analytics ingestion

    console.log(`[daily-metrics] Completed for ${artistSlug}`);
  });
}

interface FanScoringPayload { artistSlug: string }

export function registerFanScoringWorker(queue: PgBoss): void {
  queue.work<FanScoringPayload>(QUEUE.FAN_SCORING, { batchSize: 1 }, async ([job]) => {
    const { artistSlug } = job.data;
    console.log(`[fan-scoring] Starting for ${artistSlug}`);

    const { scoreFans } = await import("../intelligence/fan-scoring.js");
    const artistId = await resolveArtistId(artistSlug);
    await scoreFans(artistId);

    console.log(`[fan-scoring] Completed for ${artistSlug}`);
  });
}
