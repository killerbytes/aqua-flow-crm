import { describe, expect, it } from "vitest";
import {
  businessDateAtTimeOf,
  businessDateKey,
  endOfBusinessDay,
  startOfBusinessDay,
} from "../../src/lib/business-time";

// 01:30 on Nov 9 in Manila, but still Nov 8 in UTC.
const AFTER_MIDNIGHT_MANILA = new Date("2026-11-08T17:30:00Z");

describe("Unit - Business time (Asia/Manila)", () => {
  it("should start the day at Manila midnight", () => {
    expect(startOfBusinessDay(AFTER_MIDNIGHT_MANILA).toISOString()).toBe(
      "2026-11-08T16:00:00.000Z",
    );
  });

  it("should shift by whole Manila days", () => {
    expect(startOfBusinessDay(AFTER_MIDNIGHT_MANILA, 1).toISOString()).toBe(
      "2026-11-09T16:00:00.000Z",
    );
    expect(startOfBusinessDay(AFTER_MIDNIGHT_MANILA, -13).toISOString()).toBe(
      "2026-10-26T16:00:00.000Z",
    );
  });

  it("should end the day just before the next Manila midnight", () => {
    expect(endOfBusinessDay(AFTER_MIDNIGHT_MANILA).toISOString()).toBe(
      "2026-11-09T15:59:59.999Z",
    );
  });

  it("should give the Manila calendar date", () => {
    expect(businessDateKey(AFTER_MIDNIGHT_MANILA)).toBe("2026-11-09");
  });

  it("should put an entered date at the current Manila time of day", () => {
    // 01:30 Manila on Nov 9, so Nov 3 at 01:30 Manila (Nov 2, 17:30 UTC).
    expect(
      businessDateAtTimeOf("2026-11-03", AFTER_MIDNIGHT_MANILA)?.toISOString(),
    ).toBe("2026-11-02T17:30:00.000Z");
  });

  it("should refuse text that isn't a calendar date", () => {
    expect(businessDateAtTimeOf("2026-02-30", AFTER_MIDNIGHT_MANILA)).toBeNull();
    expect(businessDateAtTimeOf("yesterday", AFTER_MIDNIGHT_MANILA)).toBeNull();
  });
});
