import PgBoss from "pg-boss";
import { env } from "../lib/env.js";

let boss: PgBoss | null = null;

export async function getQueue(): Promise<PgBoss> {
  if (boss) return boss;

  boss = new PgBoss({
    connectionString: env.DATABASE_URL,
    schema:           "pgboss",
    monitorStateIntervalSeconds: 30,
    deleteAfterDays:  7,
  });

  boss.on("error", (err) => console.error("[queue]", err));
  await boss.start();
  return boss;
}

export async function stopQueue(): Promise<void> {
  if (boss) {
    await boss.stop();
    boss = null;
  }
}

export const QUEUE = {
  DAILY_METRICS:  "daily-metrics",
  FAN_SCORING:    "fan-scoring",
  TREND_DETECT:   "trend-detection",
  TELEGRAM_SNAP:  "telegram-snapshot",
  SMART_LINKS:    "smart-links-ingest",
} as const;
