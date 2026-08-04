"use client";
import { ProductInventory } from "@/backend/models";
import DataTable from "@/components/DataTable";
import { createColumnHelper } from "@tanstack/react-table";

export default function InventoryList({
  products,
}: {
  products: ProductInventory[];
}) {
  const columnHelper = createColumnHelper<ProductInventory>();
  const columns = [
    columnHelper.accessor("productId", {
      header: "ID",
      cell: (info) => (
        <span className="font-mono font-semibold">#{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("name", {
      header: "Name",
      cell: (info) => info.getValue() || "N/A",
    }),
    columnHelper.accessor("stockInStation", {
      header: "Stock In Station",
    }),
    columnHelper.accessor("stockWithCustomers", {
      header: "Stock With Customers",
    }),
    columnHelper.accessor("stockDamaged", {
      header: "Damaged Stock",
    }),
    columnHelper.accessor("stockLost", {
      header: "Lost Stock",
    }),
    columnHelper.accessor("unitPrice", {
      header: "Price",
      cell: (info) => info.getValue() || "N/A",
    }),
  ];
  return <DataTable data={products} columns={columns} />;
}
