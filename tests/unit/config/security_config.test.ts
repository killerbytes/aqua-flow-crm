import { describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs/config", () => ({
  withSentryConfig: (config: unknown) => config,
}));

interface HeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

describe("Unit - Security Headers", () => {
  const getHeaders = async () => {
    const { default: config } = await import("../../../next.config.mjs");
    const [rule] = (await (
      config as { headers: () => Promise<HeaderRule[]> }
    ).headers()) as HeaderRule[];
    const headers: Record<string, string> = Object.fromEntries(
      rule.headers.map((h) => [h.key, h.value]),
    );
    return { source: rule.source, headers };
  };

  it("should apply to every path", async () => {
    expect((await getHeaders()).source).toBe("/:path*");
  });

  it("should stop the app being framed", async () => {
    const { headers } = await getHeaders();
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Content-Security-Policy"]).toContain(
      "frame-ancestors 'none'",
    );
  });

  it("should not restrict scripts, which would break Next.js pages", async () => {
    const { headers } = await getHeaders();
    expect(headers["Content-Security-Policy"]).not.toMatch(
      /default-src|script-src/,
    );
  });

  it("should set the remaining headers", async () => {
    const { headers } = await getHeaders();
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBeDefined();
    expect(headers["Permissions-Policy"]).toBeDefined();
    expect(headers["Strict-Transport-Security"]).toContain("max-age=");
  });
});
