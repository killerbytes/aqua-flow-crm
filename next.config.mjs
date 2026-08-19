import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["sequelize", "pg", "pg-hstore", "sqlite3"],
  async rewrites() {
    return [
      {
        source: "/graphql",
        destination: "/api/graphql",
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || "aqua-flow",
  project: process.env.SENTRY_PROJECT || "aqua-flow-next",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  silent: !process.env.CI,
});

