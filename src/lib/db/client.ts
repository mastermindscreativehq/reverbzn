// ============================================================
// REVERBZN OS — Drizzle DB Client
// Uses postgres.js driver with Supabase connection pooling
// ============================================================
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Prevent multiple DB connections in dev (Next.js hot-reload)
declare global {
  // eslint-disable-next-line no-var
  var _pgClient: postgres.Sql | undefined;
}

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.local.example to .env.local and add your Supabase connection string."
    );
  }

  return postgres(url, {
    prepare: false, // required for Supabase transaction pooler
    max: 10,        // allow concurrent queries across server components
  });
}

const client = globalThis._pgClient ?? createClient();
if (process.env.NODE_ENV !== "production") globalThis._pgClient = client;

export const db = drizzle(client, { schema });
export type DB = typeof db;
