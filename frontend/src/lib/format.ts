/* Small formatting helpers used across pages. */

export function formatINR(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (Number.isNaN(num)) return "₹0";

  if (Math.abs(num) >= 100000) {
    const lakh = num / 100000;
    return `₹${lakh.toFixed(lakh >= 10 ? 0 : 1)}L`;
  }

  return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function formatINRFull(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (Number.isNaN(num)) return "₹0";
  return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
