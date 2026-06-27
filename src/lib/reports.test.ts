import { describe, it, expect } from "vitest";
import { buildRange, computeReport, type ReportInput } from "./reports";
import type { Delivery, DeliveryFinancial, Payment } from "@/lib/types";
import type { SupplierTotals } from "@/lib/ledger";

const deliveries: Delivery[] = [
  { id: "d1", supplierId: "s1", supplierName: "Prathic", materialId: "m1", materialName: "Glue", unit: "kg", quantity: 500, date: "2026-06-10", createdBy: "u" },
  { id: "d2", supplierId: "s2", supplierName: "B Gou", materialId: "m2", materialName: "Cement", unit: "Nos", quantity: 50, date: "2026-06-10", createdBy: "u" },
  { id: "d3", supplierId: "s1", supplierName: "Prathic", materialId: "m1", materialName: "Glue", unit: "kg", quantity: 100, date: "2026-05-01", createdBy: "u" },
];
const financials: DeliveryFinancial[] = [
  { id: "d1", price: 64, lineTotal: 32000 },
  { id: "d2", price: 37, lineTotal: 1850 },
  { id: "d3", price: 60, lineTotal: 6000 },
];
const payments: Payment[] = [
  { id: "p1", supplierId: "s1", amount: 20000, date: "2026-06-11", createdBy: "u" },
  { id: "p2", supplierId: "s1", amount: 5000, date: "2026-05-02", createdBy: "u" },
];
const perSupplier: SupplierTotals[] = [
  { supplierId: "s1", name: "Prathic", amount: 38000, given: 25000, balance: 13000, deliveryCount: 2, unpricedCount: 0 },
  { supplierId: "s2", name: "B Gou", amount: 1850, given: 0, balance: 1850, deliveryCount: 1, unpricedCount: 0 },
];
const input: ReportInput = {
  deliveries,
  financials,
  payments,
  supplierNames: new Map([["s1", "Prathic"], ["s2", "B Gou"]]),
  perSupplier,
};

describe("buildRange", () => {
  const today = new Date("2026-06-15T12:00:00");
  it("day = today", () => {
    expect(buildRange("day", today)).toMatchObject({ start: "2026-06-15", end: "2026-06-15" });
  });
  it("month spans the calendar month", () => {
    expect(buildRange("month", today)).toMatchObject({ start: "2026-06-01", end: "2026-06-30" });
  });
  it("fortnight = last 15 days inclusive", () => {
    expect(buildRange("fortnight", today)).toMatchObject({ start: "2026-06-02", end: "2026-06-15" });
  });
  it("custom passes through", () => {
    expect(buildRange("custom", today, { start: "2026-01-01", end: "2026-03-31" })).toMatchObject({
      start: "2026-01-01",
      end: "2026-03-31",
    });
  });
});

describe("computeReport", () => {
  const june = buildRange("month", new Date("2026-06-15T12:00:00"));
  const report = computeReport(input, june);

  it("totals only in-range deliveries", () => {
    expect(report.totalSpend).toBe(33850); // d1 + d2, not d3 (May)
    expect(report.deliveryCount).toBe(2);
  });

  it("totals only in-range payments", () => {
    expect(report.totalPayments).toBe(20000); // p1 only
  });

  it("breaks down by supplier with current outstanding", () => {
    const s1 = report.bySupplier.find((r) => r.supplierId === "s1")!;
    expect(s1.spend).toBe(32000);
    expect(s1.payments).toBe(20000);
    expect(s1.outstanding).toBe(13000); // current overall balance
  });

  it("breaks down by material", () => {
    const glue = report.byMaterial.find((r) => r.materialName === "Glue")!;
    expect(glue.quantity).toBe(500);
    expect(glue.value).toBe(32000);
  });

  it("builds a daily trend for a <=31 day range", () => {
    expect(report.trend.length).toBe(30);
    const d10 = report.trend.find((t) => t.label === "10 Jun")!;
    expect(d10.value).toBe(33850);
  });
});

describe("computeReport long range buckets monthly", () => {
  const range = buildRange("custom", new Date(), { start: "2026-05-01", end: "2026-06-30" });
  const report = computeReport(input, range);
  it("uses monthly buckets and includes all data", () => {
    expect(report.trend.length).toBe(2);
    expect(report.totalSpend).toBe(39850); // all three deliveries
  });
});
