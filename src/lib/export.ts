import type { ReportData } from "@/lib/reports";

export interface DeliveryLogExportRow {
  Date: string;
  Supplier: string;
  Site: string;
  Material: string;
  Unit: string;
  Qty: number | string;
  "Rate (₹)": number | string;
  "Value (₹)": number | string;
  "Paid (₹)": number;
  "Balance (₹)": number;
  "Added by": string;
}

/**
 * Export a report as a multi-sheet Excel workbook. xlsx is imported
 * dynamically so it stays out of the main bundle until first used.
 */
export async function exportReportToExcel(
  report: ReportData,
  deliveryLog?: DeliveryLogExportRow[],
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const summary = XLSX.utils.aoa_to_sheet([
    ["Construction Ledger — Report"],
    ["Period", `${report.range.start} to ${report.range.end}`],
    [],
    ["Total purchases (₹)", report.totalSpend],
    ["Payments made (₹)", report.totalPayments],
    ["Deliveries", report.deliveryCount],
  ]);
  XLSX.utils.book_append_sheet(wb, summary, "Summary");

  const bySupplier = XLSX.utils.json_to_sheet(
    report.bySupplier.map((r) => ({
      Supplier: r.name,
      "Purchases (₹)": r.spend,
      "Paid in period (₹)": r.payments,
      "Outstanding balance (₹)": r.outstanding,
    })),
  );
  XLSX.utils.book_append_sheet(wb, bySupplier, "By supplier");

  const byMaterial = XLSX.utils.json_to_sheet(
    report.byMaterial.map((r) => ({
      Material: r.materialName,
      Unit: r.unit,
      Quantity: r.quantity,
      "Value (₹)": r.value,
    })),
  );
  XLSX.utils.book_append_sheet(wb, byMaterial, "By material");

  const supplierMaterials = XLSX.utils.json_to_sheet(
    report.bySupplier.flatMap((s) =>
      s.materials.map((m) => ({
        Supplier: s.name,
        Material: m.materialName,
        Unit: m.unit,
        Quantity: m.quantity,
        "Value (₹)": m.value,
      })),
    ),
  );
  XLSX.utils.book_append_sheet(wb, supplierMaterials, "Supplier materials");

  const payments = XLSX.utils.json_to_sheet(
    report.payments.map((p) => ({
      Date: p.date,
      "Amount (₹)": p.amount,
      Note: p.note ?? "",
    })),
  );
  XLSX.utils.book_append_sheet(wb, payments, "Payments");

  if (deliveryLog && deliveryLog.length > 0) {
    const dlSheet = XLSX.utils.json_to_sheet(deliveryLog);
    XLSX.utils.book_append_sheet(wb, dlSheet, "Delivery log");
  }

  const fname = `flux-report_${report.range.start}_to_${report.range.end}.xlsx`;
  XLSX.writeFile(wb, fname);
}
