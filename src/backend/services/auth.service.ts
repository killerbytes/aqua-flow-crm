import { User } from "../models";
import { comparePassword, signToken } from "@/lib/auth";

export function mapUserToDTO(u: any) {
  if (!u) return null;
  const raw = u.get ? u.get({ plain: true }) : u;
  return {
    userId: raw.user_id ?? raw.userId,
    name: raw.name,
    email: raw.email,
    role: raw.role,
    createdAt: raw.createdAt ?? raw.created_at,
    updatedAt: raw.updatedAt ?? raw.updated_at,
  };
}

export class AuthService {
  /**
   * Authenticate a user with email and password and return token and user profile.
   */
  static async login(email: string, password: string) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const hash = (user as any).passwordHash ?? (user as any).password_hash;
    const isValid = await comparePassword(password, hash);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    const session = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = signToken(session);
    return { token, user: mapUserToDTO(user) };
  }

  /**
   * Fetch current authenticated user's details.
   */
  static async me(userId: number) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password_hash"] },
    });
    return mapUserToDTO(user);
  }

  /**
   * Get all users excluding password hashes.
   */
  static async getUsers() {
    const users = await User.findAll({ attributes: { exclude: ["password_hash"] } });
    return users.map(mapUserToDTO);
  }

  /**
   * Get single user by ID.
   */
  static async getUserById(id: number | string) {
    const user = await User.findByPk(Number(id), {
      attributes: { exclude: ["password_hash"] },
    });
    return mapUserToDTO(user);
  }

  /**
   * Create a new user record.
   */
  static async createUser(input: {
    name: string;
    email: string;
    password?: string;
    role: string;
  }) {
    const user = await User.create({
      name: input.name,
      email: input.email,
      password_hash: input.password || "$2a$10$placeholderhash",
      role: input.role,
    } as any);
    return mapUserToDTO(user);
  }

  /**
   * Update existing user record.
   */
  static async updateUser(id: number | string, input: any) {
    const user = await User.findByPk(Number(id));
    if (!user) throw new Error("User not found");
    await user.update(input);
    return mapUserToDTO(user);
  }

  /**
   * Delete user record by ID.
   */
  static async deleteUser(id: number | string) {
    const count = await User.destroy({ where: { user_id: Number(id) } });
    return count > 0;
  }
}
