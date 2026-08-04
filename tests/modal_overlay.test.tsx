import { describe, expect, it } from "vitest";
import React from "react";
import { DialogContent } from "../src/components/ui/dialog";

describe("DialogContent Overlay Customization Component Props", () => {
  it("should accept overlayClassName prop on DialogContent", () => {
    const element = <DialogContent overlayClassName="z-[100] bg-black/60 backdrop-blur-xs" />;
    expect(element.props.overlayClassName).toBe("z-[100] bg-black/60 backdrop-blur-xs");
  });
});
