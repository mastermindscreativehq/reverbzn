import { getQueue, stopQueue } from "../queues/index.js";
import { registerJobs } from "../jobs/registry.js";
import { registerDailyMetricsWorker, registerFanScoringWorker } from "./daily-metrics.js";
import { registerIntelligenceWorkers } from "./intelligence.js";

async function main() {
  console.log("[runner] ReverbZn OS backend starting...");

  const queue = await getQueue();

  registerDailyMetricsWorker(queue);
  registerFanScoringWorker(queue);
  registerIntelligenceWorkers(queue);

  await registerJobs(queue);

  console.log("[runner] All workers registered. Listening for jobs...");

  process.on("SIGTERM", async () => {
    console.log("[runner] SIGTERM received, shutting down...");
    await stopQueue();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("[runner] SIGINT received, shutting down...");
    await stopQueue();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[runner] Fatal:", err);
  process.exit(1);
});
