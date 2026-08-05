import React from "react";
import { describe, expect, it } from "vitest";
import { ColorBadge, MonoText } from "../src/components/ui/presentation";

describe("Consolidated Presentation Components (MonoText & ColorBadge)", () => {
  it("should render MonoText with default font-mono styling and custom className", () => {
    const rendered = MonoText({ children: "#12345", className: "font-semibold" });
    expect(rendered.type).toBe("span");
    expect(rendered.props.children).toBe("#12345");
    expect(rendered.props.className).toContain("text-xs");
    expect(rendered.props.className).toContain("font-mono");
    expect(rendered.props.className).toContain("font-semibold");
  });

  it("should render ColorBadge with color map and uppercase transformation", () => {
    const colorMap = {
      ADMIN: "bg-purple-100 text-purple-800",
      CASHIER: "bg-blue-100 text-blue-800",
    };
    const rendered = ColorBadge({ children: "admin", colorMap });
    expect(rendered.props.children).toBe("ADMIN");
    expect(rendered.props.className).toContain("bg-purple-100 text-purple-800");
  });
});
