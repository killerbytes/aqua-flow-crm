// backend/src/config/env.ts
import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// Load base .env
dotenv.config();

// Load .env.local (overrides base .env)
dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
  override: true,
});

// Load environment specific .env.[NODE_ENV] if specified (e.g. .env.development or .env.production)
const nodeEnv = process.env.NODE_ENV || "development";
dotenv.config({
  path: path.resolve(process.cwd(), `.env.${nodeEnv}`),
  override: true,
});

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z
    .string()
    .default("3001")
    .transform((val) => parseInt(val, 10)),
  JWT_SECRET: z
    .string()
    .min(10, "JWT_SECRET must be at least 10 characters long")
    .default("super_secret_jwt_key"),
  DB_NAME: z.string().default("crystal_clear_crm"),
  DB_USER: z.string().default("postgres"),
  DB_PASSWORD: z.string().default("secret"),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z
    .string()
    .default("5432")
    .transform((val) => parseInt(val, 10)),
});

const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
};

export const env = parseEnv();
