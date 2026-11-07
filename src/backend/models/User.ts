import { UserRole } from "@/lib/definitions";
import { CreationOptional, DataTypes, Model } from "sequelize";
import { sequelize } from "../db/database";

export class User extends Model {
  declare userId: number;
  declare name: string;
  declare username: string;
  declare passwordHash: string;
  declare role: UserRole;
  declare isActive: boolean;
  declare tokenVersion: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt?: CreationOptional<Date> | null;
}
User.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      defaultValue: UserRole.CASHIER,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    // Tokens carry this. Incrementing it cancels all of a user's sessions.
    tokenVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: true,
    paranoid: true,
    // Keeps the hash out of every query and include. Only login should use
    // User.scope("withPassword").
    defaultScope: { attributes: { exclude: ["passwordHash"] } },
    scopes: { withPassword: { attributes: { exclude: [] } } },
  },
);
