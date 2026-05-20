/**
 * Smart link analytics ingestion.
 * Parses click + pre-save data from smart link platforms (ToneDen, Feature.fm, Hypeddit).
 * Writes results into platformTrackMetricsDaily via upsert.
 */
import { db, schema } from "../lib/db.js";
import { eq, and } from "drizzle-orm";
import { format } from "date-fns";

type PlatformSlug = "spotify" | "apple_music" | "audiomack" | "boomplay" | "youtube" | "soundcloud";

export interface SmartLinkClick {
  trackId:    string;
  platform:   PlatformSlug;
  date:       string;
  clicks:     number;
  preSaves:   number;
  territory:  string;
}

export async function ingestSmartLinkClicks(clicks: SmartLinkClick[]): Promise<void> {
  for (const c of clicks) {
    await db
      .insert(schema.platformTrackMetricsDaily)
      .values({
        trackId:     c.trackId,
        platformSlug: c.platform,
        date:         c.date,
        streams:      0,
        listeners:    0,
        saves:        c.preSaves,
      })
      .onConflictDoUpdate({
        target: [
          schema.platformTrackMetricsDaily.trackId,
          schema.platformTrackMetricsDaily.platformSlug,
          schema.platformTrackMetricsDaily.date,
        ],
        set: {
          saves: c.preSaves,
        },
      });
  }
}

export async function fetchTonedenStats(_campaignId: string): Promise<SmartLinkClick[]> {
  // TODO: implement ToneDen API call when credentials are available
  return [];
}

export async function fetchFeatureFmStats(_campaignId: string): Promise<SmartLinkClick[]> {
  // TODO: implement Feature.fm API call when credentials are available
  return [];
}
