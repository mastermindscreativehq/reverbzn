import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../src/lib/db/schema.js";
import { env } from "./env.js";

const client = postgres(env.DATABASE_URL, { max: 5 });
export const db = drizzle(client, { schema });

export { schema };
