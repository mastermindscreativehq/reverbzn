import PgBoss from "pg-boss";
import { env } from "../lib/env.js";

let boss: PgBoss | null = null;

export const QUEUE = {
  DAILY_METRICS:    "daily-metrics",
  FAN_SCORING:      "fan-scoring",
  TREND_DETECT:     "trend-detection",
  TELEGRAM_SNAP:    "telegram-snapshot",
  SMART_LINKS:      "smart-links-ingest",
  ACTION_EXECUTION: "action-execution",
} as const;

const ALL_QUEUES = Object.values(QUEUE);

async function createAllQueues(b: PgBoss): Promise<void> {
  for (const name of ALL_QUEUES) {
    await b.createQueue(name);
    console.log(`[queue] Created/verified queue: ${name}`);
  }
}

export async function getQueue(): Promise<PgBoss> {
  if (boss) return boss;

  boss = new PgBoss({
    connectionString: env.DATABASE_URL,
    schema:           "pgboss",
    monitorStateIntervalSeconds: 30,
    deleteAfterDays:  7,
  });

  boss.on("error", (err) => console.error("[queue] Error:", err));

  console.log("[queue] Starting pg-boss...");
  await boss.start();
  console.log("[queue] pg-boss started. Initializing queues...");

  await createAllQueues(boss);
  console.log("[queue] All queues initialized.");

  return boss;
}

export async function stopQueue(): Promise<void> {
  if (boss) {
    await boss.stop();
    boss = null;
  }
}
