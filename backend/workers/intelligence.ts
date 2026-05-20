import type PgBoss from "pg-boss";
import { QUEUE } from "../queues/index.js";
import { resolveArtistId } from "../jobs/registry.js";
import { detectTrends, writeInsights } from "../intelligence/trend-detection.js";

interface TrendPayload { artistSlug: string }
interface TelegramPayload { channelId: string }

export function registerIntelligenceWorkers(queue: PgBoss): void {
  queue.work<TrendPayload>(QUEUE.TREND_DETECT, { teamSize: 1 }, async (job) => {
    const { artistSlug } = job.data;
    console.log(`[intelligence] Trend detection for ${artistSlug}`);

    const artistId = await resolveArtistId(artistSlug);
    const signals  = await detectTrends(artistId);
    await writeInsights(artistId, signals);

    const breakouts = signals.filter(s => s.signal === "breakout");
    const decays    = signals.filter(s => s.signal === "decay");
    console.log(`[intelligence] ${breakouts.length} breakouts, ${decays.length} decays detected`);
  });

  queue.work<TelegramPayload>(QUEUE.TELEGRAM_SNAP, { teamSize: 1 }, async (job) => {
    const { channelId } = job.data;
    console.log(`[intelligence] Telegram snapshot for ${channelId}`);

    const { snapshotChannel } = await import("../services/telegram.js");
    const snap = await snapshotChannel(channelId);
    console.log(`[intelligence] Telegram: ${snap.memberCount} members`);
  });
}
