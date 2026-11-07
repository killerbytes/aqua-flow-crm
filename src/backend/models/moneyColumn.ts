import { DataTypes, Model, ModelAttributeColumnOptions } from "sequelize";

/**
 * DECIMAL(10, 2) column that reads as a number. PostgreSQL returns DECIMAL as a
 * string, which would otherwise turn sums into text concatenation.
 */
export const moneyColumn = (
  attribute: string,
  options: Partial<ModelAttributeColumnOptions> = {},
): ModelAttributeColumnOptions => ({
  type: DataTypes.DECIMAL(10, 2),
  get(this: Model) {
    const value = this.getDataValue(attribute);
    return value === null || value === undefined ? value : Number(value);
  },
  ...options,
});
