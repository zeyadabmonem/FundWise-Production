import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema/index.js";
import { config } from "../config/index.js";
import { logger } from "../lib/logger.js";

const { Pool } = pg;

export let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
export let pool: pg.Pool | null = null;
export let isPostgresActive = false;

export async function initDatabase(): Promise<boolean> {
  if (!config.DATABASE_URL) {
    logger.info("ℹ️ No DATABASE_URL configured. Running with in-memory storage.");
    return false;
  }

  try {
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      connectionTimeoutMillis: 3000,
    });

    // Test connection
    const client = await pool.connect();
    client.release();

    db = drizzle(pool, { schema });
    isPostgresActive = true;
    logger.info("✅ PostgreSQL database connected successfully.");
    return true;
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error.message : String(error) },
      "⚠️ Could not connect to PostgreSQL. Falling back to in-memory storage."
    );
    isPostgresActive = false;
    return false;
  }
}
