import { describe, expect, it } from "vitest";
import { useUIStore } from "../src/store/uiStore";
import fs from "fs";
import path from "path";

describe("CustomerLookup Modal Closing Behavior", () => {
  it("should update isCustomerLookupModalOpen state in uiStore", () => {
    useUIStore.getState().setCustomerLookupModalOpen(true);
    expect(useUIStore.getState().isCustomerLookupModalOpen).toBe(true);

    useUIStore.getState().setCustomerLookupModalOpen(false);
    expect(useUIStore.getState().isCustomerLookupModalOpen).toBe(false);
  });

  it("should stop propagation on modal click in CustomerLookup.tsx to prevent event bubbling to parent triggers", () => {
    const filePath = path.join(process.cwd(), "src/components/CustomerLookup.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    expect(content).toMatch(/stopPropagation/);
  });

  it("should wrap SidebarMenuButton inside CustomerLookup in Sidebar.tsx", () => {
    const filePath = path.join(process.cwd(), "src/components/shared/Sidebar.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    expect(content).toMatch(/<CustomerLookup>\s*<SidebarMenuButton/);
  });
});
