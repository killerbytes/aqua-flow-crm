import { DataTypes, Model, NonAttribute, Order } from "sequelize";
import { sequelize } from "../db/database";
import { ProductInventory } from "./ProductInventory";

export class OrderDetail extends Model {
  declare detailId: number;
  declare orderId: number;
  declare productId: number;
  declare quantity: number;
  declare unitPrice: number;
  declare discount: number;
  declare product?: NonAttribute<ProductInventory>;
  declare order?: NonAttribute<Order>;
}
OrderDetail.init(
  {
    detailId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unitPrice: { type: DataTypes.FLOAT, allowNull: false },
    discount: { type: DataTypes.FLOAT, defaultValue: 0 },
  },
  {
    sequelize,
    modelName: "OrderDetail",
    tableName: "order_details",
    timestamps: false,
  },
);
