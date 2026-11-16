import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * The project has no linter, so nothing else stops `any` creeping back into
 * `src`. This reads the source the way the other source checks do.
 *
 * It only sees `any` that is written out. A value that is `any` because of
 * where it came from needs the type-check to catch it, which is why the models
 * declare their attributes and services return records through `toPlain`.
 */
const SRC = path.resolve(process.cwd(), "src");

/**
 * Files allowed to use `any`, with how many times. Each one says why in a
 * comment beside it. Adding to this list should be rare and explained.
 */
const ALLOWED: Record<string, number> = {
  // TanStack only accepts a mixed list of columns with the value type open.
  "src/components/DataTable.tsx": 1,
  // A report's sections have different row types in one list.
  "src/features/reports/definitions.ts": 1,
};

// `any` in a type position: after ":", "as", "<", ",", "|" or "=", or as `any[]`.
const EXPLICIT_ANY = /(?::|\bas|<|,|\||=)\s*any\b|\bany\[\]/g;

const isComment = (line: string) => /^\s*(\/\/|\/\*|\*)/.test(line);

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function findExplicitAny() {
  const found: Record<string, string[]> = {};
  for (const file of sourceFiles(SRC)) {
    const name = path.relative(process.cwd(), file).split(path.sep).join("/");
    fs.readFileSync(file, "utf-8")
      .split(/\r?\n/)
      .forEach((line, index) => {
        if (isComment(line)) return;
        const matches = line.match(EXPLICIT_ANY);
        if (!matches) return;
        for (let i = 0; i < matches.length; i++) {
          (found[name] ??= []).push(`${name}:${index + 1}: ${line.trim()}`);
        }
      });
  }
  return found;
}

describe("Typing - no explicit any in src", () => {
  const found = findExplicitAny();

  it("should not use any outside the allowed files", () => {
    const unexpected = Object.entries(found)
      .filter(([file]) => !(file in ALLOWED))
      .flatMap(([, lines]) => lines);
    expect(unexpected).toEqual([]);
  });

  it("should not add more any to the allowed files", () => {
    for (const [file, limit] of Object.entries(ALLOWED)) {
      expect(found[file] ?? [], file).toHaveLength(limit);
    }
  });
});
