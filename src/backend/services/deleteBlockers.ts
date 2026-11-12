import { Transaction } from "sequelize";
import { CustomerEquipmentBalance } from "../models";

export const countLabel = (count: number, label: string) =>
  `${count} ${label}${count === 1 ? "" : "s"}`;

/** Containers still out, regular and temporary, for a customer or a product. */
export const countContainersOut = async (
  where: { customerId: number } | { productId: number },
  transaction: Transaction,
) => {
  const balances = await CustomerEquipmentBalance.findAll({
    where,
    transaction,
  });
  return balances.reduce(
    (sum, balance) =>
      sum + balance.quantityOwed + balance.quantityTemporaryOwed,
    0,
  );
};
