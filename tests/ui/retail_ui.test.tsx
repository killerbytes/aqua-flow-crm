import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");

const RETAIL = "src/features/retail/components";

describe("UI - Retail", () => {
  it("should record a sale through the action, with a peso discount and no prices", () => {
    const modal = read(`${RETAIL}/RetailSaleModal.tsx`);

    expect(modal).toContain('"use client"');
    expect(modal).toContain("createRetailSaleAction");
    expect(modal).toContain("getRetailProductsAction");
    expect(modal).toContain('name="discount"');
    expect(modal).toContain('name="paymentMethod"');
    // Defaults to the walk-in account, with a customer optional.
    expect(modal).toContain("customerId: undefined");
    expect(modal).toContain("OrderCustomerLookupButton");
    // Out-of-stock products can't be picked.
    expect(modal).toContain("disabled={p.stockOnHand <= 0}");
    // The server prices the sale; the form never sends a price.
    expect(modal).not.toMatch(/unitPrice|basePrice:/);
  });

  it("should keep client components off backend code except actions and types", () => {
    for (const file of fs.readdirSync(path.resolve(process.cwd(), RETAIL))) {
      const source = read(`${RETAIL}/${file}`);
      const backendImports = [
        // [^;] spans lines, so multi-line imports are caught too.
        ...source.matchAll(/^import (type )?[^;]*? from "@\/backend\/([^"]+)";/gm),
      ];
      for (const [, isType, target] of backendImports) {
        expect(
          isType || target.startsWith("actions") || target.startsWith("schemas"),
          `${file} imports @/backend/${target}`,
        ).toBeTruthy();
      }
    }
  });

  it("should guard the page and gate its buttons by permission", () => {
    const page = read("src/app/retail/page.tsx");

    expect(page).toContain('requirePagePermission("VIEW_RETAIL")');
    expect(page).toContain('checkPermission(user.role, "SELL_RETAIL")');
    expect(page).toContain('checkPermission(user.role, "MANAGE_PRODUCTS")');
    expect(page).toContain('checkPermission(user.role, "ADJUST_INVENTORY")');
    expect(page).toContain('checkPermission(user.role, "VOID_RETAIL_SALE")');
    expect(page).toContain("RetailSaleModal");
  });

  it("should filter sales with the orders calendar, opening on today", () => {
    const page = read("src/app/retail/page.tsx");
    const filter = read(`${RETAIL}/RetailSaleDateFilter.tsx`);

    expect(page).toContain("<RetailSaleDateFilter");
    expect(page).not.toContain("DateRangeFilter from=");
    expect(page).toContain("from: params.from ?? today");
    expect(page).toContain("to: params.to ?? today");
    expect(filter).toContain('"use client"');
    expect(filter).toContain("<CalendarDatePicker");
    // Philippine dates in the URL, and a new range starts on page 1.
    expect(filter).toContain("businessDateKey(range.from)");
    expect(filter).toContain('params.delete("page")');
  });

  it("should link Retail from the sidebar for those who may view it", () => {
    const sidebar = read("src/components/shared/Sidebar.tsx");

    expect(sidebar).toContain('can("VIEW_RETAIL")');
    expect(sidebar).toContain('href: "/retail"');
  });

  it("should show a customer's retail purchases on their page", () => {
    const page = read("src/app/customers/[id]/page.tsx");

    expect(page).toContain("Retail Purchases");
    expect(page).toContain("RetailSaleService.getAll");
    expect(page).toContain("<RetailSaleList");
  });
});
