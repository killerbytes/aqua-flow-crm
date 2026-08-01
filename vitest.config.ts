/// <reference types="vitest" />
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    server: {
      deps: {
        inline: ["graphql", "@graphql-tools/schema", "@apollo/server"],
      },
    },
  },
  ssr: {
    noExternal: ["graphql", "@graphql-tools/schema", "@apollo/server"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["graphql"],
  },
});
