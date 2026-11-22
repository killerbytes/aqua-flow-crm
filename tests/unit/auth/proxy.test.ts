import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { signToken } from "../../../src/lib/auth.edge";
import { proxy } from "../../../src/proxy";
import { forgeClaims, nowInSeconds, readClaims } from "../../helpers/session";

const request = (path: string, token?: string) =>
  new NextRequest(`http://localhost${path}`, {
    headers: token ? { cookie: `token=${token}` } : {},
  });

const redirectOf = (response: Response) => {
  const location = response.headers.get("location");
  return location ? new URL(location) : null;
};

describe("Unit - Proxy Authentication", () => {
  it.each([
    "/",
    "/orders",
    "/orders/1",
    "/orders/1.0",
    "/customers/1.0",
    "/invoices/1.0",
    "/invoices/1.0/print",
    "/reports/report.png",
    "/reports/sales/csv",
    "/orders/logo.jpg",
    "/apiary",
    "/loginx",
  ])("should redirect %s to login without a session", async (path) => {
    const response = await proxy(request(path));

    expect(response.status).toBe(307);
    expect(redirectOf(response)?.pathname).toBe("/login");
  });

  it.each([
    "/login",
    "/logo.jpg",
    "/favicon.ico",
    "/api/auth/login",
    "/api/health",
    "/_next/static/chunk.js",
  ])("should allow %s without a session", async (path) => {
    const response = await proxy(request(path));
    expect(response.headers.get("location")).toBeNull();
  });

  it("should remember where the visitor was going", async () => {
    const response = await proxy(request("/invoices/7/print"));
    expect(redirectOf(response)?.searchParams.get("redirect")).toBe(
      "/invoices/7/print",
    );
  });

  it("should allow pages with a valid session, leaving the cookie alone", async () => {
    const token = await signToken({ userId: 1, role: "ADMIN" });
    const response = await proxy(request("/orders/1", token));

    expect(response.headers.get("location")).toBeNull();
    expect(response.cookies.get("token")).toBeUndefined();
  });

  describe("tokens that don't verify", () => {
    const cases: [string, () => Promise<string>][] = [
      ["garbage", async () => "not-a-real-token"],
      [
        "a token signed with another secret",
        () => forgeClaims({ userId: 1 }, nowInSeconds() + 900, "another-secret"),
      ],
      [
        "a token expired past the refresh window",
        () => forgeClaims({ userId: 1 }, nowInSeconds() - 8 * 24 * 60 * 60),
      ],
      [
        "a session older than 30 days",
        () =>
          forgeClaims({
            userId: 1,
            sessionStart: nowInSeconds() - 31 * 24 * 60 * 60,
          }),
      ],
      ["a token with a non-numeric user id", () => forgeClaims({ userId: "1" })],
    ];

    it.each(cases)(
      "should send %s to login and clear the cookie",
      async (_, makeToken) => {
        const response = await proxy(request("/orders", await makeToken()));

        expect(redirectOf(response)?.pathname).toBe("/login");
        expect(response.cookies.get("token")?.value).toBe("");
      },
    );
  });

  it("should renew a recently expired token and carry on to the page", async () => {
    const sessionStart = nowInSeconds() - 3600;
    const expired = await forgeClaims(
      { userId: 1, role: "ADMIN", sessionStart },
      nowInSeconds() - 60,
    );

    const response = await proxy(request("/orders", expired));

    expect(response.headers.get("location")).toBeNull();
    const cookie = response.cookies.get("token");
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    expect(readClaims(cookie!.value)).toMatchObject({ userId: 1, sessionStart });
    expect(readClaims(cookie!.value).exp).toBeGreaterThan(nowInSeconds());
  });
});
