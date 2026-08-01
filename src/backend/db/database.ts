import dotenv from "dotenv";
import path from "path";
import { Sequelize } from "sequelize";

// Explicitly load .env.local and .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

/**
 * Builds PostgreSQL connection URL using environment variables.
 */
export function getDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }
  const dbUser = env.DB_USER || "postgres";
  const dbPassword = env.DB_PASSWORD || "postgres";
  const dbHost = env.DB_HOST || "localhost";
  const dbPort = env.DB_PORT || "5432";
  const dbName = env.DB_NAME || "aquaflow";

  return `postgres://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
}

const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

export const sequelize = isTest
  ? new Sequelize("sqlite::memory:", {
      logging: false,
      dialectModule: require("sqlite3"),
    })
  : new Sequelize(getDatabaseUrl(), {
      dialect: "postgres",
      logging: false,
      dialectModule: require("pg"),
      define: {
        underscored: true,
      },
    });

let isDbInitialized = false;
let initPromise: Promise<void> | null = null;

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
          try {
            if (process.env.NODE_ENV !== "production") {
              await sequelize.sync({ alter: true });
              console.info("Database tables synchronized successfully.");
            }
          } catch (syncErr) {
            // Fallback sync to guarantee table creation without dropping constraints
            await sequelize.sync({ alter: false });
          }
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

// Auto-trigger initialization on server module load (except during seeding or test runs)
if (
  typeof window === "undefined" &&
  !isSeedingScript &&
  process.env.NODE_ENV !== "test"
) {
  initDatabase().catch((err) => {
    console.error("Auto database initialization error:", err);
  });
}
