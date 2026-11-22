import { describe, expect, it } from "vitest";
import { PAGINATION } from "../../src/lib/definitions";
import { parsePageParams, toPagination } from "../../src/lib/pagination";

const DEFAULTS = { page: PAGINATION.PAGE, limit: PAGINATION.PAGE_SIZE };

describe("Unit - Pagination", () => {
  describe("parsePageParams", () => {
    it("should use the app defaults when nothing is asked for", () => {
      expect(parsePageParams()).toEqual(DEFAULTS);
      expect(parsePageParams({})).toEqual(DEFAULTS);
    });

    it("should read the strings search params arrive as", () => {
      expect(parsePageParams({ page: "3", limit: "50" })).toEqual({
        page: 3,
        limit: 50,
      });
    });

    it("should fall back to the defaults for values that aren't numbers", () => {
      expect(parsePageParams({ page: "abc", limit: "" })).toEqual(DEFAULTS);
      expect(parsePageParams({ page: null, limit: undefined })).toEqual(DEFAULTS);
      expect(parsePageParams({ page: "0", limit: "0" })).toEqual(DEFAULTS);
      expect(parsePageParams({ page: ["2", "3"] })).toEqual(DEFAULTS);
    });

    // /orders?page=-1 would otherwise ask the database for a negative OFFSET,
    // which PostgreSQL rejects.
    it.each(["-1", "1.5", "Infinity", "1e999"])(
      "should fall back to the defaults for a page or limit of %s",
      (value) => {
        expect(parsePageParams({ page: value })).toEqual(DEFAULTS);
        expect(parsePageParams({ limit: value })).toEqual(DEFAULTS);
      },
    );
  });

  describe("toPagination", () => {
    it("should count a partly filled last page", () => {
      expect(toPagination(51, 25, 2)).toEqual({
        total: 51,
        totalPages: 3,
        currentPage: 2,
      });
    });

    it("should not add a page when the last one is exactly full", () => {
      expect(toPagination(50, 25, 1).totalPages).toBe(2);
    });

    it("should have no pages for an empty list", () => {
      expect(toPagination(0, 25, 1)).toEqual({
        total: 0,
        totalPages: 0,
        currentPage: 1,
      });
    });
  });
});
