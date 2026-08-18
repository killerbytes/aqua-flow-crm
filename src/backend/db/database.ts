import { env } from "@/backend/db/env";
import { Sequelize } from "sequelize";

export function getDatabaseUrl(
  overrideEnv: Record<string, string | undefined> = {},
): string {
  const dbUrl = overrideEnv.DATABASE_URL || env.DATABASE_URL;
  if (dbUrl) {
    return dbUrl;
  }

  const dbUser = overrideEnv.DB_USER || env.DB_USER || "postgres";
  const dbPassword = overrideEnv.DB_PASSWORD || env.DB_PASSWORD || "postgres";
  const dbHost = overrideEnv.DB_HOST || env.DB_HOST || "localhost";
  const dbPort = overrideEnv.DB_PORT || env.DB_PORT || "5432";
  const dbName = overrideEnv.DB_NAME || env.DB_NAME || "aquaflow";

  return `postgres://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
}

export const poolOptions = {
  max: 5,
  min: 0,
  acquire: 30000,
  idle: 10000,
  evict: 1000,
};

export function getSequelizePoolOptions() {
  return poolOptions;
}

const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

export const sequelize = isTest
  ? new Sequelize("sqlite::memory:", {
      logging: false,
      dialectModule: require("sqlite3"),
      pool: poolOptions,
    })
  : new Sequelize(getDatabaseUrl(), {
      dialect: "postgres",
      logging: false,
      dialectModule: require("pg"),
      define: {
        underscored: true,
      },
      pool: poolOptions,
    });

let isDbInitialized = false;
let initPromise: Promise<void> | null = null;

export function markDbInitialized() {
  isDbInitialized = true;
}

const isSeedingScript =
  process.env.IS_SEEDING === "true" ||
  (typeof process !== "undefined" &&
    Boolean(process.argv) &&
    process.argv.some((arg) => arg.includes("seed")));

export function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      if (isDbInitialized || isSeedingScript) return;

      try {
        if (isTest) {
          await sequelize.sync({ force: true });
          isDbInitialized = true;
        } else {
          await sequelize.authenticate();
          // Production Best Practice: Schema changes are managed strictly via
          // version-controlled migration files in `src/backend/migrations`
          // (`npm run db:migrate`). Runtime `sequelize.sync({ alter: true })`
          // is disabled to ensure zero table locking or data loss risks.
          isDbInitialized = true;
        }
      } catch (error) {
        console.warn(
          "PostgreSQL database connection failed during initDatabase execution:",
          error,
        );
      }
    })();
  }
  return initPromise;
}

// NOTE: Database initialization is intentionally NOT triggered automatically
// on module load. Importing this module (directly or transitively, e.g. via
// backend services/models used in Server Components) happens during the
// Next.js build step (page data collection / static analysis), which runs on
// developer machines and CI without access to Railway's internal network
// (postgres.railway.internal only resolves inside Railway infrastructure).
//
// Instead, initDatabase() must be called explicitly at runtime, right before
// the first query is made (e.g. in API routes / server actions / page
// handlers). It is memoized via `initPromise`, so calling it multiple times
// is safe and cheap after the first successful call.
