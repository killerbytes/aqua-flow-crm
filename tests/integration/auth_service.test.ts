import { beforeAll, describe, expect, it } from "vitest";
import { User } from "../../src/backend/models";
import { InvoiceService } from "../../src/backend/services/invoice.service";
import { OrderService } from "../../src/backend/services/order.service";
import { hashPassword, signToken, verifyOrRefreshToken } from "../../src/lib/auth";
import { loginAction } from "../../src/backend/actions/auth.actions";
import { AuthService } from "../../src/backend/services/auth.service";
import { UserRole } from "../../src/lib/definitions";
import { setupTestDatabase } from "../helpers/db.setup";

describe("Integration - Auth Service & Server Actions", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  it("should authenticate valid user credentials successfully", async () => {
    const result = await AuthService.login("admin", "pass");
    expect(result).toBeDefined();
    expect(result.token).toBeDefined();
    expect(result.user.username).toBe("admin");
    expect(result.user.role).toBe(UserRole.ADMIN);
  });

  it("should reject authentication for invalid password", async () => {
    await expect(AuthService.login("admin", "wrongpass")).rejects.toThrow();
  });

  it("should return failure result from loginAction on invalid credentials without throwing", async () => {
    const result = await loginAction("admin", "wrongpass");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid email or password");
  });

  it("should return success result from loginAction on valid credentials", async () => {
    const result = await loginAction("admin", "pass");
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    // The token must stay in the httpOnly cookie.
    expect(result).not.toHaveProperty("token");
  });

  it("should reject login for a deactivated user", async () => {
    await User.create({
      name: "Former Staff",
      username: "formerstaff",
      passwordHash: await hashPassword("password123"),
      role: UserRole.CASHIER,
      isActive: false,
    });

    await expect(
      AuthService.login("formerstaff", "password123"),
    ).rejects.toThrow("deactivated");
  });

  it("should not recognize a deactivated user's existing token", async () => {
    const user = await User.findOne({ where: { username: "formerstaff" } });
    const token = await signToken(user!.get({ plain: true }));
    expect(await verifyOrRefreshToken(token)).toBeNull();
  });

  describe("password hash exposure", () => {
    const decode = (token: string) =>
      JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());

    it("should keep the hash out of login results and tokens", async () => {
      const { token, user } = await AuthService.login("admin", "pass");
      expect(user).not.toHaveProperty("passwordHash");
      expect(decode(token)).not.toHaveProperty("passwordHash");
    });

    it("should strip the hash from a token even when given one", async () => {
      const token = await signToken({ userId: 1, passwordHash: "secret" });
      expect(decode(token)).not.toHaveProperty("passwordHash");
    });

    it("should keep the hash out of the session user", async () => {
      const admin = await User.findOne({ where: { username: "admin" } });
      const token = await signToken(admin!.get({ plain: true }));
      const result = await verifyOrRefreshToken(token);
      expect(result?.user.userId).toBe(admin!.userId);
      expect(result?.user).not.toHaveProperty("passwordHash");
    });

    it("should keep the hash out of user management results", async () => {
      const created = await AuthService.createUser({
        name: "Hash Check",
        username: "hashcheck",
        password: "password123",
        role: UserRole.CASHIER,
      });
      expect(created).not.toHaveProperty("passwordHash");

      const changed = await AuthService.changePassword(created.userId, {
        password: "password456",
        confirmPassword: "password456",
      });
      expect(changed).not.toHaveProperty("passwordHash");
    });

    it("should keep other users' hashes out of orders and invoice payments", async () => {
      const order = await OrderService.get(1);
      expect(order?.user?.username).toBeDefined();
      expect(order?.user).not.toHaveProperty("passwordHash");

      const unpaid = await OrderService.create(
        {
          customerId: order!.customerId,
          status: "PENDING",
          paymentStatus: "UNPAID",
          items: [{ productId: 1, quantity: 1 }],
        } as any,
        1,
      );
      const invoice = await InvoiceService.create(
        { customerId: order!.customerId, status: "UNPAID", items: [unpaid!.orderId] },
        1,
      );
      await InvoiceService.payInvoice(
        { invoiceId: invoice.invoiceId, paymentAmount: 1, paymentMethod: "CASH" },
        1,
      );
      const [payment] = await InvoiceService.getPayments(invoice.invoiceId);
      expect(payment.user?.username).toBeDefined();
      expect(payment.user).not.toHaveProperty("passwordHash");
    });
  });

  it("should create new users and prevent duplicate usernames", async () => {
    const newUser = await AuthService.createUser({
      name: "Test Cashier",
      username: "testcashier",
      password: "password123",
      role: UserRole.CASHIER,
    });

    expect(newUser).toBeDefined();
    expect(newUser.username).toBe("testcashier");

    await expect(
      AuthService.createUser({
        name: "Duplicate Cashier",
        username: "testcashier",
        password: "password123",
        role: UserRole.CASHIER,
      }),
    ).rejects.toThrow();
  });
});
