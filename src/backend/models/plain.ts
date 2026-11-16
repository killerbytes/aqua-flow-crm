import type { Attributes, Model, ModelAttributes, Optional } from "sequelize";

/**
 * What a model instance looks like once it has been turned into a plain object:
 * its columns and whichever associations were included, without the Sequelize
 * methods. Included models become plain as well.
 */
export type Plain<T> = T extends Date
  ? T
  : T extends (infer Item)[]
    ? Plain<Item>[]
    : T extends Model
      ? { [K in keyof T as K extends keyof Model ? never : K]: Plain<T[K]> }
      : T;

/**
 * Turns a model instance into the plain object that pages and client components
 * receive. Sequelize types `get({ plain: true })` as the columns only, which
 * drops the included associations, so this is the one place that restores them.
 */
export function toPlain<M extends Model>(instance: M): Plain<M> {
  return instance.get({ plain: true }) as Plain<M>;
}

type TimestampColumn = "createdAt" | "updatedAt" | "deletedAt";

/**
 * The column definitions for `Model.init`. Sequelize adds the timestamp columns
 * itself, so they are declared on the class but can be left out here.
 */
export function columns<M extends Model>(
  definitions: ModelAttributes<
    M,
    Optional<Attributes<M>, Extract<keyof Attributes<M>, TimestampColumn>>
  >,
): ModelAttributes<M, Attributes<M>> {
  return definitions as ModelAttributes<M, Attributes<M>>;
}
