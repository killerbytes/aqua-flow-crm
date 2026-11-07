import { z } from "zod";

const DEV_FALLBACK_SECRET = "super_secret_jwt_key";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "local", "production", "test"])
    .default("development"),
  PORT: z
    .string()
    .default("3000")
    .transform((val) => parseInt(val, 10)),
  JWT_SECRET: z
    .string()
    .min(10, "JWT_SECRET must be at least 10 characters long")
    .default(DEV_FALLBACK_SECRET),
  DB_NAME: z.string().default("crystal_clear_crm"),
  DB_USER: z.string().default("postgres"),
  DB_PASSWORD: z.string().default("secret"),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z
    .string()
    .default("5432")
    .transform((val) => parseInt(val, 10)),
  DATABASE_URL: z.string().default(""),
  NEXT_PUBLIC_CURRENCY: z.string().default("PHP"),
}).superRefine((value, ctx) => {
  // A known secret would let anyone forge a login. next build has no runtime
  // secrets to check, so it is exempt.
  if (
    value.NODE_ENV === "production" &&
    value.JWT_SECRET === DEV_FALLBACK_SECRET &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["JWT_SECRET"],
      message: "JWT_SECRET must be set in production",
    });
  }
});

const parseEnv = () => {
  // In Node.js runtime (standalone scripts like seed.ts), ensure .env.local and .env are loaded
  if (typeof process !== "undefined" && process.env.NEXT_RUNTIME !== "edge") {
    try {
      const dotenv = require("dotenv");
      const path = require("path");
      if (dotenv && path && typeof process.cwd === "function") {
        const cwd = process.cwd();
        const nodeEnv = process.env.NODE_ENV || "development";
        dotenv.config();
        dotenv.config({
          path: path.resolve(cwd, ".env.local"),
          override: true,
        });
        if (nodeEnv) {
          dotenv.config({
            path: path.resolve(cwd, `.env.${nodeEnv}`),
            override: true,
          });
        }
      }
    } catch {
      // Ignore if require or dotenv is unavailable
    }
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.format());
    throw new Error(
      "Invalid environment variables: " + JSON.stringify(parsed.error.format()),
    );
  }

  return parsed.data;
};

export const env = parseEnv();
