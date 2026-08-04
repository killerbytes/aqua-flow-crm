import { comparePassword, signToken } from "@/lib/auth";
import { User } from "../models";
import { UserFormSchema, UserSchema } from "../schemas/zodSchemas";

export class AuthService {
  static async login(username: string, password: string) {
    const searchUsername = username.includes("@")
      ? username.split("@")[0]
      : username;

    const user =
      (await User.findOne({ where: { username: searchUsername } })) ||
      (await User.findOne({ where: { username } }));

    if (!user) {
      throw new Error("Invalid email or password");
    }

    const hash = (user as any).passwordHash ?? (user as any).password_hash;
    const isValid = await comparePassword(password, hash);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    const plainUser = user.get({ plain: true });
    const userDTO = {
      ...plainUser,
      email: plainUser.email || username,
    };

    const token = await signToken(userDTO as any);
    return { token, user: userDTO };
  }

  static async me(userId: number) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ["passwordHash"] },
    });
    return user?.get({ plain: true });
  }

  static async getUsers() {
    const users = await User.findAll({
      attributes: { exclude: ["passwordHash"] },
      order: [["userId", "ASC"]],
    });
    return users.map((user) => user.get({ plain: true }));
  }

  static async getUserById(id: number | string) {
    const user = await User.findByPk(Number(id), {
      attributes: { exclude: ["passwordHash"] },
    });
    return user?.get({ plain: true });
  }

  static async createUser(input: {
    name: string;
    email: string;
    password?: string;
    role: string;
  }) {
    const validatedData = UserSchema.parse(input);
    const user = await User.create({
      ...validatedData,
      passwordHash: input.password,
    } as any);
    return user?.get({ plain: true });
  }

  static async updateUser(id: number | string, input: any) {
    const validatedData = UserFormSchema.parse(input);
    const user = await User.findByPk(Number(id));
    if (!user) throw new Error("User not found");
    await user.update(validatedData);
    return user?.get({ plain: true });
  }

  static async deleteUser(id: number | string) {
    const count = await User.destroy({ where: { user_id: Number(id) } });
    return count > 0;
  }
}
