import { beforeAll, describe, expect, it } from "vitest";
import { initDatabase } from "../src/backend/db/database";
import { seedDatabase } from "../src/backend/db/seed";
import { User } from "../src/backend/models";
import { signToken, verifyOrRefreshToken } from "../src/lib/auth";
import { UserRole } from "../src/lib/definitions";

describe("JWT Security & Deactivated User Verification", () => {
  let activeUser: User;
  let inactiveUser: User;

  beforeAll(async () => {
    await initDatabase();
    await seedDatabase({ clean: true, testCount: 5 });

    activeUser = (await User.findOne({ where: { role: UserRole.ADMIN } }))!;

    inactiveUser = await User.create({
      name: "Deactivated User",
      username: "deactivated_user",
      passwordHash: "hash",
      role: UserRole.CASHIER,
      isActive: false,
    });
  });

  it("should verify valid active user token", async () => {
    const token = await signToken(activeUser.get({ plain: true }));
    const result = await verifyOrRefreshToken(token);

    expect(result).not.toBeNull();
    expect(result?.user.username).toBe(activeUser.username);
  });

  it("should reject token for deactivated user (isActive: false)", async () => {
    const token = await signToken(inactiveUser.get({ plain: true }));
    const result = await verifyOrRefreshToken(token);

    expect(result).toBeNull();
  });

  it("should reject token for deleted non-existent user", async () => {
    const token = await signToken({
      userId: 999999,
      username: "ghost_user",
      role: UserRole.CASHIER,
    });
    const result = await verifyOrRefreshToken(token);

    expect(result).toBeNull();
  });
});
