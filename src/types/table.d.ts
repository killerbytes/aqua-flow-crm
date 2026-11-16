import type { RowData } from "@tanstack/react-table";

// What this app keeps in a column's `meta`, so reading it needs no cast.
declare module "@tanstack/react-table" {
  // The type parameters must match the library's declaration to merge with it.
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "left" | "right" | "center";
  }
}
