import { describe, expect, it } from "vitest";
import { csvResponse, toCsv } from "../../src/lib/csv";

describe("Unit - CSV", () => {
  it("should quote cells with commas, quotes, or line breaks", () => {
    expect(toCsv(["A", "B"], [["Cruz, Juan", 'Say "hi"'], ["two\nlines", 3]])).toBe(
      'A,B\r\n"Cruz, Juan","Say ""hi"""\r\n"two\nlines",3',
    );
  });

  it("should leave empty cells for missing values", () => {
    expect(toCsv(["A", "B", "C"], [[null, undefined, 0]])).toBe("A,B,C\r\n,,0");
  });

  it("should stop text a spreadsheet would run as a formula", () => {
    expect(toCsv(["Name"], [["=HYPERLINK(\"x\")"], ["+63 917"], ["@sum"]])).toBe(
      'Name\r\n"\'=HYPERLINK(""x"")"\r\n\'+63 917\r\n\'@sum',
    );
  });

  it("should keep negative numbers as numbers", () => {
    expect(toCsv(["N"], [[-5]])).toBe("N\r\n-5");
  });

  it("should send a UTF-8 download with a byte order mark", async () => {
    const res = csvResponse("report.csv", "Name\r\nPeñaranda");
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="report.csv"',
    );
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });
});
