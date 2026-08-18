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

export default nextConfig;
