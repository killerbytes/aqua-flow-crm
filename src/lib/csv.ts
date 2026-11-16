export type CsvValue = string | number | null | undefined;

/**
 * Spreadsheet apps run a cell that starts with one of these as a formula, so a
 * customer named "=HYPERLINK(...)" could do harm when the file is opened.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

const escapeCell = (value: CsvValue) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);

  const text = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (headers: string[], rows: CsvValue[][]) =>
  [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");

/**
 * A download response. The byte order mark makes Excel read the file as UTF-8,
 * so names like "Peñaranda" don't come out garbled.
 */
export const csvResponse = (filename: string, csv: string) =>
  new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
