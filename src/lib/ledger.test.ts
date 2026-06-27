import { describe, it, expect } from "vitest";
import {
  computeSupplierTotals,
  computeLedgerTotals,
  lineTotal,
} from "./ledger";
import type { Delivery, DeliveryFinancial, Payment, Supplier } from "@/lib/types";

const suppliers: Supplier[] = [
  { id: "s1", name: "Prathic" },
  { id: "s2", name: "B Gou" },
];

const deliveries: Delivery[] = [
  { id: "d1", supplierId: "s1", supplierName: "Prathic", materialId: "m1", materialName: "Glue", unit: "kg", quantity: 500, date: "2026-06-01", createdBy: "u" },
  { id: "d2", supplierId: "s1", supplierName: "Prathic", materialId: "m2", materialName: "Cement", unit: "Nos", quantity: 10, date: "2026-06-02", createdBy: "u" },
  { id: "d3", supplierId: "s2", supplierName: "B Gou", materialId: "m2", materialName: "Cement", unit: "Nos", quantity: 50, date: "2026-06-03", createdBy: "u" },
];

const financials: DeliveryFinancial[] = [
  { id: "d1", price: 64, lineTotal: 32000 },
  // d2 unpriced
  { id: "d3", price: 37, lineTotal: 1850 },
];

const payments: Payment[] = [
  { id: "p1", supplierId: "s1", amount: 20000, date: "2026-06-05", createdBy: "u" },
  { id: "p2", supplierId: "s2", amount: 1850, date: "2026-06-06", createdBy: "u" },
];

describe("lineTotal", () => {
  it("multiplies and rounds to 2 decimals", () => {
    expect(lineTotal(500, 64)).toBe(32000);
    expect(lineTotal(3, 33.333)).toBe(100);
  });
});

describe("computeSupplierTotals", () => {
  const totals = computeSupplierTotals(suppliers, deliveries, financials, payments);
  const byId = Object.fromEntries(totals.map((t) => [t.supplierId, t]));

  it("sums priced deliveries into amount", () => {
    expect(byId.s1.amount).toBe(32000);
    expect(byId.s2.amount).toBe(1850);
  });

  it("counts unpriced deliveries", () => {
    expect(byId.s1.unpricedCount).toBe(1);
    expect(byId.s1.deliveryCount).toBe(2);
    expect(byId.s2.unpricedCount).toBe(0);
  });

  it("subtracts payments to get balance", () => {
    expect(byId.s1.given).toBe(20000);
    expect(byId.s1.balance).toBe(12000);
    expect(byId.s2.balance).toBe(0);
  });

  it("sorts by descending balance", () => {
    expect(totals[0].supplierId).toBe("s1");
  });

  it("ignores payments/deliveries for unknown suppliers", () => {
    const t = computeSupplierTotals(
      suppliers,
      [...deliveries, { ...deliveries[0], id: "dx", supplierId: "ghost" }],
      financials,
      [...payments, { id: "px", supplierId: "ghost", amount: 999, date: "x", createdBy: "u" }],
    );
    expect(t.find((x) => x.supplierId === "ghost")).toBeUndefined();
  });
});

describe("computeLedgerTotals", () => {
  it("rolls up headline figures", () => {
    const per = computeSupplierTotals(suppliers, deliveries, financials, payments);
    const totals = computeLedgerTotals(per);
    expect(totals.totalSpend).toBe(33850);
    expect(totals.totalGiven).toBe(21850);
    expect(totals.totalOutstanding).toBe(12000);
    expect(totals.supplierCount).toBe(2);
    expect(totals.deliveryCount).toBe(3);
    expect(totals.unpricedCount).toBe(1);
  });
});
