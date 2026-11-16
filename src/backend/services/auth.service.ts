import { toPlain } from "../models/plain";
import { comparePassword, hashPassword, signToken } from "@/lib/auth";
import { User } from "../models";
import {
  ChangePasswordData,
  ChangePasswordSchema,
  UserFormUpdateSchema,
  UserSchema,
} from "../schemas/zodSchemas";

export class AuthenticationError extends Error {}

const toSafeUser = (user: User) => {
  const { passwordHash, ...safeUser } = toPlain(user);
  return safeUser;
};

export class AuthService {
  static async login(username: string, password: string) {
    const UserWithPassword = User.scope("withPassword");
    const searchUsername = username.includes("@")
      ? username.split("@")[0]
      : username;

    const user =
      (await UserWithPassword.findOne({ where: { username: searchUsername } })) ||
      (await UserWithPassword.findOne({ where: { username } }));

    if (!user) {
      throw new AuthenticationError("Invalid email or password");
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError("Invalid email or password");
    }

    // Checked after the password so this can't reveal which usernames exist.
    if (user.isActive === false) {
      throw new AuthenticationError("This account has been deactivated");
    }

    const plainUser = toSafeUser(user);
    const userDTO = {
      ...plainUser,
      email: username,
    };

    const token = await signToken(userDTO);
    return { token, user: userDTO };
  }

  static async me(userId: number) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ["passwordHash"] },
    });
    return user ? toPlain(user) : undefined;
  }

  static async getUsers() {
    const users = await User.findAll({
      attributes: { exclude: ["passwordHash"] },
      order: [["userId", "ASC"]],
    });
    return users.map((user) => toPlain(user));
  }

  static async getUserById(id: number | string) {
    const user = await User.findByPk(Number(id), {
      attributes: { exclude: ["passwordHash"] },
    });
    return user ? toPlain(user) : undefined;
  }

  static async createUser(input: {
    name: string;
    username: string;
    password?: string;
    role: string;
  }) {
    const { password, ...fields } = UserSchema.parse(input);
    const user = await User.create({
      ...fields,
      passwordHash: await hashPassword(password),
    });
    return toSafeUser(user);
  }

  static async updateUser(id: number | string, input: unknown) {
    const validatedData = UserFormUpdateSchema.parse(input);

    const user = await User.findByPk(Number(id));
    if (!user) throw new Error("User not found");

    // Old sessions shouldn't come back to life if the account is reactivated.
    const activeChanged =
      validatedData.isActive !== undefined &&
      validatedData.isActive !== user.isActive;

    await user.update(validatedData);
    if (activeChanged) {
      await AuthService.revokeSessions(user.userId);
      await user.reload();
    }
    return toPlain(user);
  }

  /** Cancels every session the user has, on every device. */
  static async revokeSessions(userId: number) {
    await User.increment("tokenVersion", { where: { userId } });
  }

  static async changePassword(id: number, input: ChangePasswordData) {
    const validatedData = ChangePasswordSchema.parse(input);
    const user = await User.findByPk(id);
    if (!user) throw new Error("User not found");
    await user.update({
      passwordHash: await hashPassword(validatedData.password),
    });
    await AuthService.revokeSessions(user.userId);
    return toSafeUser(user);
  }
}
