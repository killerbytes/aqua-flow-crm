import { createRequire } from "module";
import path from "path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { selectBackupsToDelete } = require(
  path.resolve(process.cwd(), "backup.js"),
);

const backup = (key: string, day: number) => ({
  Key: key,
  LastModified: new Date(Date.UTC(2026, 0, day)),
});

const fullBackups = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    backup(`railway-full-${i + 1}.dump`, i + 1),
  );

describe("Unit - Backup Retention", () => {
  it("should keep everything at or under the limit", () => {
    expect(selectBackupsToDelete(fullBackups(7), "railway-full-", 7)).toEqual(
      [],
    );
  });

  it("should delete only the oldest backups over the limit", () => {
    const toDelete = selectBackupsToDelete(fullBackups(9), "railway-full-", 7);

    expect(toDelete.map((file: { Key: string }) => file.Key)).toEqual([
      "railway-full-2.dump",
      "railway-full-1.dump",
    ]);
  });

  it("should never touch files that aren't this kind of backup", () => {
    const others = [
      backup("railway-data-only-1.sql.gz", 1),
      backup("other-database-full-1.dump", 1),
      backup("notes.txt", 1),
    ];

    const toDelete = selectBackupsToDelete(
      [...others, ...fullBackups(8)],
      "railway-full-",
      7,
    );

    expect(toDelete.map((file: { Key: string }) => file.Key)).toEqual([
      "railway-full-1.dump",
    ]);
  });

  it("should handle an empty bucket", () => {
    expect(selectBackupsToDelete(undefined, "railway-full-", 7)).toEqual([]);
  });
});
