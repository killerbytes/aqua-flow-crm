import { describe, expect, it } from "vitest";
import { formatPeso, fromCents, toCents } from "../../src/lib/money";

describe("Unit - Money", () => {
  describe("toCents", () => {
    it.each([
      [0, 0],
      [1, 100],
      [35.5, 3550],
      [19.99, 1999],
      [100.3, 10030],
      // Each of these is a hair under the true value as a float.
      [1.15, 115],
      [4.35, 435],
      [0.1 + 0.2, 30],
      [-12.34, -1234],
    ])("should turn %s pesos into %s centavos", (pesos, cents) => {
      expect(toCents(pesos)).toBe(cents);
    });

    it("should read the strings a DECIMAL column can come back as", () => {
      expect(toCents("100.30")).toBe(10030);
      expect(toCents("0.10")).toBe(10);
    });

    it("should count a missing amount as zero", () => {
      expect(toCents(null)).toBe(0);
      expect(toCents(undefined)).toBe(0);
      expect(toCents("")).toBe(0);
    });

    it("should always give whole centavos", () => {
      for (let cents = 0; cents <= 2000; cents++) {
        expect(toCents(cents / 100)).toBe(cents);
      }
    });
  });

  describe("fromCents", () => {
    it("should turn centavos back into pesos", () => {
      expect(fromCents(10030)).toBe(100.3);
      expect(fromCents(0)).toBe(0);
      expect(fromCents(-1234)).toBe(-12.34);
    });

    it("should add amounts exactly where floats drift", () => {
      expect(0.1 + 0.2).not.toBe(0.3);
      expect(fromCents(toCents(0.1) + toCents(0.2))).toBe(0.3);

      const tenths = Array.from({ length: 10 }, () => toCents(0.1));
      expect(fromCents(tenths.reduce((sum, c) => sum + c, 0))).toBe(1);
    });
  });

  describe("formatPeso", () => {
    it("should show pesos with a plain P, two decimals, and thousands separators", () => {
      expect(formatPeso(1234.5)).toBe("P1,234.50");
      expect(formatPeso(1000000)).toBe("P1,000,000.00");
      expect(formatPeso(35)).toBe("P35.00");
    });

    it("should show zero as an amount, not as missing", () => {
      expect(formatPeso(0)).toBe("P0.00");
    });

    it("should keep the sign on a negative amount", () => {
      expect(formatPeso(-5)).toBe("-P5.00");
    });
  });
});
