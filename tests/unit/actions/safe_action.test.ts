import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import * as authContext from "../../../src/backend/auth/context";
import { createProtectedAction } from "../../../src/backend/lib/safe-action";
import { UserRole } from "../../../src/lib/definitions";

vi.mock("../../../src/backend/db/database", () => ({
  initDatabase: vi.fn().mockResolvedValue(undefined),
}));

describe("Unit - safeAction Pipeline Builder", () => {
  it("should return success data when auth, permission, schema, and handler pass", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 1, name: "Admin", role: UserRole.ADMIN },
    } as any);

    const action = createProtectedAction({
      permission: "CREATE_ORDER",
      schema: z.object({ name: z.string() }),
      handler: async (ctx, input: { name: string }) => {
        return { id: 100, name: input.name, createdBy: ctx.user.userId };
      },
    });

    const res = await action({ name: "Acme Corp" });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toEqual({ id: 100, name: "Acme Corp", createdBy: 1 });
    }
  });

  it("should support multiple positional parameters", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 1, name: "Admin", role: UserRole.ADMIN },
    } as any);

    const updateAction = createProtectedAction({
      permission: "CREATE_ORDER",
      handler: async (ctx, id: number, data: { name: string }) => {
        return { id, name: data.name, updatedBy: ctx.user.userId };
      },
    });

    const res = await updateAction(42, { name: "Updated Name" });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toEqual({
        id: 42,
        name: "Updated Name",
        updatedBy: 1,
      });
    }
  });

  it("should return unauthorized error when user is unauthenticated", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue(null as any);

    const action = createProtectedAction({
      handler: async () => "secret data",
    });

    const res = await action();

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/Unauthorized/i);
    }
  });

  it("should return forbidden error when user role lacks required permission", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 2, name: "Driver", role: UserRole.DELIVERY },
    } as any);

    const action = createProtectedAction({
      permission: "MANAGE_USERS",
      handler: async () => "users list",
    });

    const res = await action();

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/Forbidden/i);
    }
  });

  it("should return validation error when input fails zod schema parse", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 1, name: "Admin", role: UserRole.ADMIN },
    } as any);

    const action = createProtectedAction({
      schema: z.object({ email: z.string().email() }),
      handler: async (ctx, input: { email: string }) => input,
    });

    const res = await action({ email: "invalid-email" });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/Validation failed/i);
      expect(res.fieldErrors).toBeDefined();
    }
  });

  it("should catch thrown errors in handler and return structured error response", async () => {
    vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
      user: { userId: 1, name: "Admin", role: UserRole.ADMIN },
    } as any);

    const action = createProtectedAction({
      handler: async () => {
        throw new Error("Phone number already exists");
      },
    });

    const res = await action();

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe("Phone number already exists");
    }
  });
});
