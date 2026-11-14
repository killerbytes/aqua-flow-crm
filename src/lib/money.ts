/** Whole centavos. Do money arithmetic in these, because floats drift. */
export const toCents = (amount: number | string | null | undefined): number =>
  Math.round(Number(amount || 0) * 100);

export const fromCents = (cents: number): number => cents / 100;

const pesoFormat = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

/**
 * Pesos with a plain "P" rather than "₱", as on the rest of the app's money.
 * Unlike formatCurrency it shows zero as P0.00 rather than "N/A".
 */
export const formatPeso = (amount: number) =>
  pesoFormat
    .formatToParts(amount)
    .map((part) => (part.type === "currency" ? "P" : part.value))
    .join("");
