/** Whole centavos. Do money arithmetic in these, because floats drift. */
export const toCents = (amount: number | string | null | undefined): number =>
  Math.round(Number(amount || 0) * 100);

export const fromCents = (cents: number): number => cents / 100;
