import { NextRequest } from "next/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "../../src/backend/services/auth.service";
import { businessDateKey } from "../../src/lib/business-time";
import { UserRole } from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

/**
 * The CSV Route Handlers end to end: a real session token in the cookie, the
 * real permission check, and the seeded database behind the report.
 */
const session = vi.hoisted(() => ({ token: undefined as string | undefined }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "token" && session.token
        ? { name, value: session.token }
        : undefined,
    set: vi.fn(),
  }),
  headers: async () => new Headers(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

type Route = { GET: (request: NextRequest) => Promise<Response> };

const ROUTES: Record<string, () => Promise<unknown>> = {
  "inactive-customers": () =>
    import("../../src/app/reports/inactive-customers/csv/route"),
  "inactive-with-equipment": () =>
    import("../../src/app/reports/inactive-with-equipment/csv/route"),
  "temporary-equipment": () =>
    import("../../src/app/reports/temporary-equipment/csv/route"),
  sales: () => import("../../src/app/reports/sales/csv/route"),
  receivables: () => import("../../src/app/reports/receivables/csv/route"),
  voids: () => import("../../src/app/reports/voids/csv/route"),
  "equipment-ledger": () =>
    import("../../src/app/reports/equipment-ledger/csv/route"),
};

const download = async (slug: string, query = "") => {
  const { GET } = (await ROUTES[slug]()) as Route;
  const response = await GET(
    new NextRequest(`http://localhost/reports/${slug}/csv${query}`),
  );
  const text = (await response.text()).replace(/^﻿/, "");
  return {
    response,
    filename: /filename="(.+)"/.exec(
      response.headers.get("Content-Disposition") ?? "",
    )?.[1],
    lines: text.split("\r\n"),
  };
};

const signInAs = async (username: string) => {
  session.token = (await AuthService.login(username, "pass")).token;
};

describe("Integration - Report CSV Downloads", () => {
  const today = businessDateKey(new Date());

  beforeAll(async () => {
    await setupTestDatabase();
    await AuthService.createUser({
      name: "Rider",
      username: "rider",
      password: "pass",
      role: UserRole.DELIVERY,
    });
  });

  beforeEach(() => {
    session.token = undefined;
  });

  describe("who may download", () => {
    const slugs = Object.keys(ROUTES);

    it.each(slugs)("should give an Admin the %s CSV", async (slug) => {
      await signInAs("admin");

      const { response, filename, lines } = await download(slug);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe(
        "text/csv; charset=utf-8",
      );
      expect(filename).toMatch(/\.csv$/);
      expect(lines[0].split(",").length).toBeGreaterThan(1);
    });

    it.each(
      slugs.flatMap((slug) => [
        [slug, "manager", "/"],
        [slug, "cashier", "/"],
        [slug, "rider", "/orders"],
      ]),
    )("should turn the %s CSV away from %s", async (slug, username, target) => {
      await signInAs(username);
      await expect(download(slug)).rejects.toThrow(`REDIRECT ${target}`);
    });

    it.each(slugs)(
      "should send a visitor with no session away from the %s CSV",
      async (slug) => {
        await expect(download(slug)).rejects.toThrow("REDIRECT /login");
      },
    );

    it("should stop a download as soon as the Admin's sessions are revoked", async () => {
      await signInAs("admin");
      const admin = (await AuthService.getUsers()).find(
        (user) => user.username === "admin",
      )!;

      await AuthService.revokeSessions(admin.userId);

      await expect(download("sales")).rejects.toThrow("REDIRECT /login");
    });
  });

  describe("what comes down", () => {
    beforeEach(() => signInAs("admin"));

    // The seed spreads its orders over the month before 2026-07-30.
    const july = "?from=2026-07-01&to=2026-07-30";

    it("should name the sales file after its table and range", async () => {
      const { filename, lines } = await download("sales", july);

      expect(filename).toBe("sales-by-period-2026-07-01-to-2026-07-30.csv");
      expect(lines[0]).toBe("Period,Orders,Units,Sales");
      // One line per day of the range, plus the header and the totals row.
      expect(lines).toHaveLength(30 + 2);
    });

    it("should write sales as plain numbers that add up to the totals row", async () => {
      const { lines } = await download("sales", july);
      const sales = lines.slice(1).map((line) => line.split(",").at(-1)!);

      for (const amount of sales) expect(amount).toMatch(/^\d+(\.\d{1,2})?$/);

      const total = Number(sales.pop());
      const cents = sales.reduce((sum, s) => sum + Math.round(Number(s) * 100), 0);
      expect(cents).toBe(Math.round(total * 100));
      expect(total).toBeGreaterThan(0);
    });

    it.each([
      ["products", "sales-by-product", "Product,Units,Sales"],
      [
        "collections",
        "collections",
        "Method,Payments,From Orders,From Invoices,Total",
      ],
    ])(
      "should give the sales %s table when asked",
      async (table, name, header) => {
        const { filename, lines } = await download(
          "sales",
          `${july}&table=${table}`,
        );

        expect(filename).toBe(`${name}-2026-07-01-to-2026-07-30.csv`);
        expect(lines[0]).toBe(header);
      },
    );

    const firstTables = [
      ["sales", "sales-by-period"],
      ["voids", "voids-and-reversals"],
      ["equipment-ledger", "equipment-balance-sheet"],
    ];

    it.each(firstTables)(
      "should fall back to the first %s table for one that doesn't exist",
      async (slug, name) => {
        const { filename } = await download(slug, "?table=nope");
        expect(filename).toMatch(new RegExp(`^${name}-`));
      },
    );

    // `name in TABLES` is also true for these, and once served a file called
    // "Object-<date>.csv" for ?table=constructor.
    it.each(firstTables)(
      "should fall back to the first %s table for a name every object has",
      async (slug, name) => {
        for (const table of ["constructor", "toString", "__proto__"]) {
          const { filename } = await download(slug, `?table=${table}`);
          expect(filename).toMatch(new RegExp(`^${name}-`));
        }
      },
    );

    it("should group sales by month when asked, and by day otherwise", async () => {
      const byMonth = await download("sales", `${july}&group=month`);
      expect(byMonth.lines[1]).toMatch(/^July 2026,/);
      expect(byMonth.lines).toHaveLength(3);

      const unknown = await download("sales", `${july}&group=decade`);
      expect(unknown.lines).toHaveLength(30 + 2);
    });

    it("should use this month so far for a range that isn't a date", async () => {
      const { filename } = await download("sales", "?from=yesterday&to=2026-13-45");

      expect(filename).toBe(
        `sales-by-period-${today.slice(0, 8)}01-to-${today}.csv`,
      );
    });

    it("should give both voids tables", async () => {
      const list = await download("voids", july);
      expect(list.filename).toBe(
        "voids-and-reversals-2026-07-01-to-2026-07-30.csv",
      );
      expect(list.lines[0]).toBe("When,Type,Reference,Customer,Amount,By,Reason");

      const users = await download("voids", `${july}&table=users`);
      expect(users.filename).toBe("voids-by-user-2026-07-01-to-2026-07-30.csv");
      expect(users.lines[0]).toBe(
        "User,Role,Orders Voided,Orders Voided Amount,Invoices Voided,Payments Reversed",
      );
    });

    it("should give both equipment ledger tables, one row per product and a total", async () => {
      const balance = await download("equipment-ledger");
      expect(balance.filename).toBe(`equipment-balance-sheet-${today}.csv`);
      expect(balance.lines[0]).toBe(
        "Product,In Station,With Customers,Damaged,Lost,Total Fleet,Ledger",
      );
      expect(balance.lines).toHaveLength(3 + 2);
      expect(balance.lines.at(-1)).toMatch(/^Total,/);

      const losses = await download("equipment-ledger", "?table=losses");
      expect(losses.filename).toBe(`equipment-losses-${today}.csv`);
      expect(losses.lines.at(-1)).toMatch(/^Total,/);
    });

    it("should put the days asked for in the inactive customers file name", async () => {
      expect((await download("inactive-customers", "?days=60")).filename).toBe(
        `inactive-customers-60d-${today}.csv`,
      );
      expect((await download("inactive-customers", "?days=-5")).filename).toBe(
        `inactive-customers-30d-${today}.csv`,
      );
      expect((await download("inactive-customers")).filename).toBe(
        `inactive-customers-30d-${today}.csv`,
      );
    });

    it("should name the remaining files after today, in Philippine time", async () => {
      expect((await download("receivables")).filename).toBe(
        `money-owed-${today}.csv`,
      );
      expect((await download("temporary-equipment")).filename).toBe(
        `temporary-equipment-${today}.csv`,
      );
    });
  });
});
