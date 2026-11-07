import { describe, expect, it, vi } from "vitest";
import {
  changePasswordAction,
  updateUserAction,
} from "../../../src/backend/actions/auth.actions";
import { updateCustomerAction } from "../../../src/backend/actions/customer.actions";
import * as authContext from "../../../src/backend/auth/context";
import { AuthService } from "../../../src/backend/services/auth.service";
import { CustomerService } from "../../../src/backend/services/customer.service";
import { UserRole } from "../../../src/lib/definitions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../../src/backend/db/database", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../src/backend/db/database")>()),
  initDatabase: vi.fn().mockResolvedValue(undefined),
}));

const signInAsAdmin = () =>
  vi.spyOn(authContext, "getAuthContext").mockResolvedValue({
    user: { userId: 1, name: "Admin", username: "admin", role: UserRole.ADMIN },
  });

describe("Unit - (id, input) Server Actions", () => {
  it("should validate customer form data, not the id", async () => {
    signInAsAdmin();
    const update = vi
      .spyOn(CustomerService, "update")
      .mockResolvedValue({ customerId: 1 } as any);
    const input = {
      name: "Edited Name",
      address: "Edited Address 123",
      phone: "",
    };

    const res = await updateCustomerAction(1, input);

    expect(res.success).toBe(true);
    expect(update).toHaveBeenCalledWith(1, input);

    const invalid = await updateCustomerAction(1, { ...input, name: "" });
    expect(invalid).toMatchObject({
      success: false,
      error: "Validation failed",
    });
    expect((invalid as any).fieldErrors.name).toBeDefined();
  });

  it("should validate user form data, not the id", async () => {
    signInAsAdmin();
    const update = vi
      .spyOn(AuthService, "updateUser")
      .mockResolvedValue({ userId: 1 } as any);
    const input = {
      name: "Admin User",
      username: "admin",
      role: UserRole.ADMIN,
    };

    const res = await updateUserAction("1", input);

    expect(res.success).toBe(true);
    expect(update).toHaveBeenCalledWith("1", input);
  });

  it("should validate password form data, not the id", async () => {
    signInAsAdmin();
    const change = vi
      .spyOn(AuthService, "changePassword")
      .mockResolvedValue({ userId: 1 } as any);
    const input = { password: "newpass1", confirmPassword: "newpass1" };

    expect((await changePasswordAction(1, input)).success).toBe(true);
    expect(change).toHaveBeenCalledWith(1, input);

    const mismatch = await changePasswordAction(1, {
      password: "newpass1",
      confirmPassword: "different",
    });
    expect(mismatch.success).toBe(false);
  });
});
