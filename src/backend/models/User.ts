import { UserRole } from "@/lib/definitions";
import { CreationOptional, DataTypes, Model } from "sequelize";
import { sequelize } from "../db/database";

export class User extends Model {
  declare userId: number;
  declare name: string;
  declare email: string;
  declare passwordHash: string;
  declare role: UserRole;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
User.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      defaultValue: UserRole.STAFF,
    },
  },
  { sequelize, modelName: "User", tableName: "users", timestamps: true },
);
