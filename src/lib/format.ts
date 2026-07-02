const inrCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const inrNumber = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

/** Format a number as Indian Rupees, e.g. 100000 -> "₹1,00,000". */
export function formatInr(amount: number): string {
  if (!Number.isFinite(amount)) return "₹0";
  return inrCurrency.format(amount);
}

/** Format a plain number with Indian grouping, e.g. quantities. Passes strings through as-is. */
export function formatNumber(value: number | string): string {
  if (typeof value === "string") return value;
  if (!Number.isFinite(value)) return "0";
  return inrNumber.format(value);
}
