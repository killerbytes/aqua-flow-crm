import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
} from "sequelize";
import { sequelize } from "../db/database";
import { moneyColumn } from "./moneyColumn";
import type { Order } from "./Order";
import { columns } from "./plain";
import { ProductInventory } from "./ProductInventory";

export class OrderDetail extends Model<
  InferAttributes<OrderDetail>,
  InferCreationAttributes<OrderDetail>
> {
  declare detailId: CreationOptional<number>;
  declare orderId: number;
  declare productId: number;
  declare quantity: number;
  declare unitPrice: number;
  declare discount: CreationOptional<number>;
  declare product?: NonAttribute<ProductInventory>;
  declare order?: NonAttribute<Order>;
}
OrderDetail.init(
  columns<OrderDetail>({
    detailId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unitPrice: moneyColumn("unitPrice", { allowNull: false }),
    discount: moneyColumn("discount", { defaultValue: 0 }),
  }),
  {
    sequelize,
    modelName: "OrderDetail",
    tableName: "order_details",
    timestamps: false,
  },
);
