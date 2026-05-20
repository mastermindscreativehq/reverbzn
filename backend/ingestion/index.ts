/**
 * Ingestion orchestrator.
 * Coordinates all platform ingestion services into a single pipeline run.
 * Called by the daily-metrics worker.
 */
import { db, schema } from "../lib/db.js";
import { eq } from "drizzle-orm";
import { env } from "../lib/env.js";
import { snapshotChannel } from "../services/telegram.js";

export interface IngestionResult {
  platform: string;
  tracksIngested: number;
  errors: string[];
}

export async function runFullIngestion(artistId: string): Promise<IngestionResult[]> {
  const results: IngestionResult[] = [];

  // Telegram snapshot
  results.push(await ingestTelegram());

  // Future: Spotify, Audiomack, YouTube, Smart Links
  // results.push(await ingestSpotify(artistId));
  // results.push(await ingestAudiomack(artistId));
  // results.push(await ingestYouTube(artistId));
  // results.push(await ingestSmartLinks(artistId));

  return results;
}

async function ingestTelegram(): Promise<IngestionResult> {
  try {
    const snap = await snapshotChannel(env.TELEGRAM_CHANNEL_ID);
    console.log(`[ingestion/telegram] ${snap.memberCount} members at ${snap.fetchedAt.toISOString()}`);
    return { platform: "telegram", tracksIngested: 0, errors: [] };
  } catch (err) {
    return { platform: "telegram", tracksIngested: 0, errors: [String(err)] };
  }
}
