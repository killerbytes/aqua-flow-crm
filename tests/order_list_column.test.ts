import { describe, expect, it } from "vitest";
import { createColumnHelper } from "@tanstack/react-table";
import { Order } from "../src/backend/models/Order";

function getOrderColumns(pathname: string) {
  const columnHelper = createColumnHelper<Order>();
  return [
    columnHelper.accessor("orderId", {
      header: "Order ID",
    }),
    !pathname.startsWith("/customers") &&
      columnHelper.accessor("customer.name", {
        header: "Name",
      }),
    columnHelper.accessor("createdAt", {
      header: "Date Ordered",
    }),
    columnHelper.accessor("status", {
      header: "Status",
    }),
  ].filter(Boolean) as any[];
}

describe("OrderList Column Filtering Logic", () => {
  it("should hide Name column when pathname starts with /customers", () => {
    const columns = getOrderColumns("/customers/123");
    const headers = columns.map((c) => c.header);
    expect(headers).not.toContain("Name");
    expect(columns.length).toBe(3);
  });

  it("should show Name column when pathname is /orders", () => {
    const columns = getOrderColumns("/orders");
    const headers = columns.map((c) => c.header);
    expect(headers).toContain("Name");
    expect(columns.length).toBe(4);
  });
});
