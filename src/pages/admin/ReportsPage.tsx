import { useMemo, useState } from "react";
import { BarChart3, Download, Loader2, IndianRupee, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useLedger } from "@/hooks/useLedger";
import { buildRange, computeReport, type PeriodPreset } from "@/lib/reports";
import { exportReportToExcel } from "@/lib/export";
import { formatInr, formatNumber } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart } from "@/components/BarChart";
import { format, startOfMonth } from "date-fns";

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "fortnight", label: "Bi-monthly" },
  { value: "month", label: "Month" },
  { value: "custom", label: "Custom" },
];

export default function ReportsPage() {
  const { deliveries, financials, payments, suppliers, perSupplier, loading } = useLedger();
  const [preset, setPreset] = useState<PeriodPreset>("month");
  const today = useMemo(() => new Date(), []);
  const [customStart, setCustomStart] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(today, "yyyy-MM-dd"));
  const [exporting, setExporting] = useState(false);

  const supplierNames = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s.name])),
    [suppliers],
  );

  const report = useMemo(() => {
    const range = buildRange(preset, today, { start: customStart, end: customEnd });
    return computeReport(
      { deliveries, financials, payments, supplierNames, perSupplier },
      range,
    );
  }, [preset, today, customStart, customEnd, deliveries, financials, payments, supplierNames, perSupplier]);

  async function handleExport() {
    setExporting(true);
    try {
      await exportReportToExcel(report);
      toast.success("Excel downloaded");
    } catch {
      toast.error("Could not export");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Reports</h1>
        </div>
        <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
          Excel
        </Button>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPreset(p.value)}
            className={
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors " +
              (preset === p.value
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent")
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="cs" className="text-xs">From</Label>
            <Input id="cs" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ce" className="text-xs">To</Label>
            <Input id="ce" type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-11" />
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {report.range.start} → {report.range.end}
      </p>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <IndianRupee className="h-4 w-4" />
              <span className="text-xs font-medium">Purchases</span>
            </div>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatInr(report.totalSpend)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-medium">Payments</span>
            </div>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatInr(report.totalPayments)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Purchases trend</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart data={report.trend} />
        </CardContent>
      </Card>

      {/* By supplier */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">By supplier</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {report.bySupplier.length === 0 ? (
            <p className="px-6 pb-2 text-sm text-muted-foreground">No data in period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.bySupplier.map((r) => (
                  <TableRow key={r.supplierId}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInr(r.spend)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInr(r.payments)}</TableCell>
                    <TableCell className="text-right tabular-nums text-amber-700">{formatInr(r.outstanding)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* By material */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">By material</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {report.byMaterial.length === 0 ? (
            <p className="px-6 pb-2 text-sm text-muted-foreground">No data in period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.byMaterial.map((r) => (
                  <TableRow key={`${r.materialName}-${r.unit}`}>
                    <TableCell className="font-medium">{r.materialName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(r.quantity)} {r.unit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatInr(r.value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
