import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";

export type Database = NeonHttpDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  ironbeatDb?: Database;
};

export function getDb(): Database {
  if (globalForDb.ironbeatDb) {
    return globalForDb.ironbeatDb;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon PostgreSQL connection string to .env.local.",
    );
  }

  const database = drizzle(neon(databaseUrl), { schema });
  globalForDb.ironbeatDb = database;
  return database;
}
