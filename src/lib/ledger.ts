import type { Delivery, DeliveryFinancial, Payment, Supplier } from "@/lib/types";

export interface SupplierTotals {
  supplierId: string;
  name: string;
  /** Total value of priced deliveries (sum of line totals). */
  amount: number;
  /** Total paid to the supplier. */
  given: number;
  /** amount - given. */
  balance: number;
  deliveryCount: number;
  /** Deliveries with no price set yet. */
  unpricedCount: number;
}

export interface LedgerTotals {
  totalSpend: number;
  totalGiven: number;
  totalOutstanding: number;
  supplierCount: number;
  deliveryCount: number;
  unpricedCount: number;
}

/** Index financials by their delivery id for O(1) lookup. */
function financialMap(financials: DeliveryFinancial[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const f of financials) m.set(f.id, f.lineTotal ?? 0);
  return m;
}

/** Compute Amount / Given / Balance per supplier. */
export function computeSupplierTotals(
  suppliers: Supplier[],
  deliveries: Delivery[],
  financials: DeliveryFinancial[],
  payments: Payment[],
): SupplierTotals[] {
  const lineTotals = financialMap(financials);

  const base = new Map<string, SupplierTotals>();
  for (const s of suppliers) {
    base.set(s.id, {
      supplierId: s.id,
      name: s.name,
      amount: 0,
      given: 0,
      balance: 0,
      deliveryCount: 0,
      unpricedCount: 0,
    });
  }

  for (const d of deliveries) {
    const t = base.get(d.supplierId);
    if (!t) continue;
    t.deliveryCount += 1;
    if (lineTotals.has(d.id)) {
      t.amount += lineTotals.get(d.id)!;
    } else {
      t.unpricedCount += 1;
    }
  }

  for (const p of payments) {
    const t = base.get(p.supplierId);
    if (!t) continue;
    t.given += p.amount ?? 0;
  }

  for (const t of base.values()) {
    t.balance = t.amount - t.given;
  }

  return [...base.values()].sort((a, b) => b.balance - a.balance);
}

/** Roll supplier totals up into headline figures. */
export function computeLedgerTotals(perSupplier: SupplierTotals[]): LedgerTotals {
  return perSupplier.reduce<LedgerTotals>(
    (acc, t) => {
      acc.totalSpend += t.amount;
      acc.totalGiven += t.given;
      acc.totalOutstanding += t.balance;
      acc.deliveryCount += t.deliveryCount;
      acc.unpricedCount += t.unpricedCount;
      return acc;
    },
    {
      totalSpend: 0,
      totalGiven: 0,
      totalOutstanding: 0,
      supplierCount: perSupplier.length,
      deliveryCount: 0,
      unpricedCount: 0,
    },
  );
}

/** Compute the line total for a delivery at a given price. */
export function lineTotal(quantity: number, price: number): number {
  return Math.round(quantity * price * 100) / 100;
}
