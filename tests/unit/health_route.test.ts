import { describe, expect, it, vi } from "vitest";
import { GET } from "../../src/app/api/health/route";
import { sequelize } from "../../src/backend/db/database";

describe("Unit - Health Check", () => {
  it("should report ok when the database responds", async () => {
    vi.spyOn(sequelize, "authenticate").mockResolvedValueOnce(undefined);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("should report 503 without error details when it doesn't", async () => {
    vi.spyOn(sequelize, "authenticate").mockRejectedValueOnce(
      new Error("connect ECONNREFUSED secret-host:5432"),
    );

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });
});
