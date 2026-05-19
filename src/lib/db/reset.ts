// ============================================================
// REVERBZN OS — Reset Script (drops and re-seeds all data)
// Run: npm run db:reset
// WARNING: Destructive. Only use in development.
// ============================================================
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (process.env.NODE_ENV === "production") {
  console.error("❌ Cannot run reset in production.");
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL ?? "", { prepare: false });
const db = drizzle(client, { schema });

async function reset() {
  console.log("🗑️  Deleting all data (order matters for FK constraints)...");

  await db.delete(schema.automationRuns);
  await db.delete(schema.automations);
  await db.delete(schema.notifications);
  await db.delete(schema.insights);
  await db.delete(schema.campaigns);
  await db.delete(schema.smartLinkClicks);
  await db.delete(schema.smartLinks);
  await db.delete(schema.fanSegmentMembers);
  await db.delete(schema.fanSegments);
  await db.delete(schema.fanEvents);
  await db.delete(schema.fans);
  await db.delete(schema.platformRegionMetricsDaily);
  await db.delete(schema.platformTrackMetricsDaily);
  await db.delete(schema.tracks);
  await db.delete(schema.platforms);
  await db.delete(schema.artists);

  console.log("✓ All data deleted.\n");
  console.log("Run 'npm run db:seed' to re-seed.\n");
}

reset().catch(err => {
  console.error("❌ Reset failed:", err);
  process.exit(1);
}).finally(() => process.exit(0));
