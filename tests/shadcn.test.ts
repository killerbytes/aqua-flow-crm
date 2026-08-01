import { describe, it, expect } from "vitest";
import { cn } from "../src/lib/utils";
import { buttonVariants } from "../src/components/ui/button";

describe("Shadcn UI Utilities & Component Variants", () => {
  it("should merge tailwind classes using cn() utility", () => {
    const merged = cn("p-4 bg-slate-900", "p-6 text-white");
    expect(merged).toBe("bg-slate-900 p-6 text-white");
  });

  it("should generate proper Shadcn button variants using cva", () => {
    const defaultBtn = buttonVariants({ variant: "default", size: "default" });
    expect(defaultBtn).toContain("bg-primary");

    const outlineBtn = buttonVariants({ variant: "outline" });
    expect(outlineBtn).toContain("border");

    const destructiveBtn = buttonVariants({ variant: "destructive" });
    expect(destructiveBtn).toContain("bg-destructive");
  });
});
