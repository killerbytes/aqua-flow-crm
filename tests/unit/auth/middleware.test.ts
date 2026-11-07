import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { signToken } from "../../../src/lib/auth.edge";
import { middleware } from "../../../src/middleware";

const request = (path: string, token?: string) =>
  new NextRequest(`http://localhost${path}`, {
    headers: token ? { cookie: `token=${token}` } : {},
  });

describe("Unit - Middleware Authentication", () => {
  it.each([
    "/",
    "/orders",
    "/orders/1",
    "/orders/1.0",
    "/customers/1.0",
    "/invoices/1.0",
    "/invoices/1.0/print",
    "/reports/report.png",
    "/orders/logo.jpg",
    "/apiary",
  ])("should redirect %s to login without a session", async (path) => {
    const response = await middleware(request(path));

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });

  it.each([
    "/login",
    "/logo.jpg",
    "/favicon.ico",
    "/api/auth/login",
    "/_next/static/chunk.js",
  ])("should allow %s without a session", async (path) => {
    const response = await middleware(request(path));
    expect(response.headers.get("location")).toBeNull();
  });

  it("should allow pages with a valid session", async () => {
    const token = await signToken({ userId: 1, role: "ADMIN" });
    const response = await middleware(request("/orders/1", token));
    expect(response.headers.get("location")).toBeNull();
  });
});
