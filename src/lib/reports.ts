import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  parseISO,
  differenceInCalendarDays,
} from "date-fns";
import type { Delivery, DeliveryFinancial, Payment } from "@/lib/types";
import type { SupplierTotals } from "@/lib/ledger";

export type PeriodPreset = "day" | "week" | "fortnight" | "month" | "custom";

export interface DateRange {
  /** yyyy-MM-dd inclusive */
  start: string;
  /** yyyy-MM-dd inclusive */
  end: string;
  label: string;
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** Build a date range for a preset relative to `today`. */
export function buildRange(
  preset: PeriodPreset,
  today: Date,
  custom?: { start: string; end: string },
): DateRange {
  switch (preset) {
    case "day":
      return { start: iso(today), end: iso(today), label: "Today" };
    case "week": {
      const s = startOfWeek(today, { weekStartsOn: 1 });
      const e = endOfWeek(today, { weekStartsOn: 1 });
      return { start: iso(s), end: iso(e), label: "This week" };
    }
    case "fortnight":
      return { start: iso(subDays(today, 13)), end: iso(today), label: "Last 15 days" };
    case "month":
      return { start: iso(startOfMonth(today)), end: iso(endOfMonth(today)), label: "This month" };
    case "custom": {
      const start = custom?.start || iso(today);
      const end = custom?.end || iso(today);
      return { start, end, label: "Custom" };
    }
  }
}

function inRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

export interface TrendBucket {
  label: string;
  value: number;
}

export interface SupplierBreakdownRow {
  supplierId: string;
  name: string;
  spend: number;
  payments: number;
  /** Current overall outstanding balance (not period-bound). */
  outstanding: number;
}

export interface MaterialBreakdownRow {
  materialName: string;
  unit: string;
  quantity: number;
  value: number;
}

export interface ReportData {
  range: DateRange;
  totalSpend: number;
  totalPayments: number;
  deliveryCount: number;
  trend: TrendBucket[];
  bySupplier: SupplierBreakdownRow[];
  byMaterial: MaterialBreakdownRow[];
  payments: Payment[];
}

export interface ReportInput {
  deliveries: Delivery[];
  financials: DeliveryFinancial[];
  payments: Payment[];
  supplierNames: Map<string, string>;
  perSupplier: SupplierTotals[];
}

/** Aggregate ledger data into a report for the given date range. */
export function computeReport(input: ReportInput, range: DateRange): ReportData {
  const lineTotals = new Map(input.financials.map((f) => [f.id, f.lineTotal ?? 0]));
  const outstandingById = new Map(input.perSupplier.map((s) => [s.supplierId, s.balance]));

  const periodDeliveries = input.deliveries.filter((d) => inRange(d.date, range));
  const periodPayments = input.payments.filter((p) => inRange(p.date, range));

  let totalSpend = 0;
  const supplierMap = new Map<string, SupplierBreakdownRow>();
  const materialMap = new Map<string, MaterialBreakdownRow>();

  function supplierRow(id: string): SupplierBreakdownRow {
    let row = supplierMap.get(id);
    if (!row) {
      row = {
        supplierId: id,
        name: input.supplierNames.get(id) ?? "Unknown",
        spend: 0,
        payments: 0,
        outstanding: outstandingById.get(id) ?? 0,
      };
      supplierMap.set(id, row);
    }
    return row;
  }

  for (const d of periodDeliveries) {
    const value = lineTotals.get(d.id) ?? 0;
    totalSpend += value;
    supplierRow(d.supplierId).spend += value;

    const key = `${d.materialName}__${d.unit}`;
    let m = materialMap.get(key);
    if (!m) {
      m = { materialName: d.materialName, unit: d.unit, quantity: 0, value: 0 };
      materialMap.set(key, m);
    }
    m.quantity += d.quantity;
    m.value += value;
  }

  let totalPayments = 0;
  for (const p of periodPayments) {
    totalPayments += p.amount;
    supplierRow(p.supplierId).payments += p.amount;
  }

  return {
    range,
    totalSpend,
    totalPayments,
    deliveryCount: periodDeliveries.length,
    trend: buildTrend(periodDeliveries, lineTotals, range),
    bySupplier: [...supplierMap.values()].sort((a, b) => b.spend - a.spend),
    byMaterial: [...materialMap.values()].sort((a, b) => b.value - a.value),
    payments: periodPayments,
  };
}

/** Bucket spend by day (<= 31 days) or by month (longer ranges). */
function buildTrend(
  deliveries: Delivery[],
  lineTotals: Map<string, number>,
  range: DateRange,
): TrendBucket[] {
  const start = parseISO(range.start);
  const end = parseISO(range.end);
  const days = differenceInCalendarDays(end, start) + 1;
  const byMonth = days > 31;

  const buckets = new Map<string, number>();
  const keyFor = (date: string) => (byMonth ? date.slice(0, 7) : date);

  if (byMonth) {
    for (const m of eachMonthOfInterval({ start, end })) buckets.set(format(m, "yyyy-MM"), 0);
  } else {
    for (const d of eachDayOfInterval({ start, end })) buckets.set(format(d, "yyyy-MM-dd"), 0);
  }

  for (const d of deliveries) {
    const k = keyFor(d.date);
    if (buckets.has(k)) buckets.set(k, buckets.get(k)! + (lineTotals.get(d.id) ?? 0));
  }

  return [...buckets.entries()].map(([k, value]) => ({
    label: byMonth ? format(parseISO(`${k}-01`), "MMM yy") : format(parseISO(k), "dd MMM"),
    value,
  }));
}
