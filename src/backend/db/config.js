const path = require("path");
const dotenv = require("dotenv");

const nodeEnv = process.env.NODE_ENV || "development";

// Load base .env first
dotenv.config();

// Load .env.local (overrides base .env)
dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
  override: true,
});

// Load environment-specific file (e.g. .env.production) with top override priority
if (nodeEnv) {
  dotenv.config({
    path: path.resolve(process.cwd(), `.env.${nodeEnv}`),
    override: true,
  });
}

if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("postgresql://")) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^postgresql:\/\//, "postgres://");
}

const dbUser = process.env.DB_USER || "postgres";
const dbPassword = process.env.DB_PASSWORD || "secret";
const dbHost = process.env.DB_HOST || "localhost";
const dbPort = Number(process.env.DB_PORT) || 5432;
const dbName = process.env.DB_NAME || "crystal_clear_crm";
const dbUrl = process.env.DATABASE_URL;

const config = {
  development: {
    username: dbUser,
    password: dbPassword,
    database: dbName,
    host: dbHost,
    port: dbPort,
    dialect: "postgres",
    logging: false,
  },
  local: {
    username: dbUser,
    password: dbPassword,
    database: dbName,
    host: dbHost,
    port: dbPort,
    dialect: "postgres",
    logging: false,
  },
  test: {
    dialect: "sqlite",
    storage: ":memory:",
    logging: false,
  },
  production: {
    use_env_variable: dbUrl ? "DATABASE_URL" : null,
    username: dbUser,
    password: dbPassword,
    database: dbName,
    host: dbHost,
    port: dbPort,
    dialect: "postgres",

    pool: {
      max: 2,
      min: 0,
      acquire: 20000,
      idle: 5000,
    },
    logging: false,
  },
};

module.exports = config;
