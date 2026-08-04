import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Customer Dynamic Route vs 404 Redirects", () => {
  it("should not contain static /customers/:slug redirect in next.config.mjs so /customers/[id] can render", () => {
    const configPath = path.resolve(process.cwd(), "next.config.mjs");
    const content = fs.readFileSync(configPath, "utf-8");
    expect(content).not.toContain("/customers/:slug");
  });

  it("should await signToken in src/app/api/auth/login/route.ts", () => {
    const routePath = path.resolve(process.cwd(), "src/app/api/auth/login/route.ts");
    const content = fs.readFileSync(routePath, "utf-8");
    expect(content).toContain("await signToken");
  });

  it("should redirect to /customers when customer is not found in src/app/customers/[id]/page.tsx", () => {
    const pagePath = path.resolve(process.cwd(), "src/app/customers/[id]/page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain('if (!customer || !customer.customerId) redirect("/customers");');
  });
});
