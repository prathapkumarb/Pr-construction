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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [supplierId, setSupplierId] = useState("all");
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
      { supplierId: supplierId === "all" ? undefined : supplierId },
    );
  }, [preset, today, customStart, customEnd, supplierId, deliveries, financials, payments, supplierNames, perSupplier]);

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

      <div className="space-y-1">
        <Label className="text-xs">Supplier</Label>
        <Select value={supplierId} onValueChange={setSupplierId}>
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All suppliers</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

      {/* By supplier (with per-supplier materials) */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">By supplier</h2>
      </div>
      {report.bySupplier.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data in period.</p>
      ) : (
        <div className="space-y-2">
          {report.bySupplier.map((r) => (
            <Card key={r.supplierId}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{r.name}</p>
                  <div className="text-right text-xs text-muted-foreground">
                    <span>Balance</span>
                    <p className="text-sm font-semibold tabular-nums text-amber-700">
                      {formatInr(r.outstanding)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Purchases <span className="font-medium text-foreground tabular-nums">{formatInr(r.spend)}</span></span>
                  <span>Paid <span className="font-medium text-foreground tabular-nums">{formatInr(r.payments)}</span></span>
                </div>
                {r.materials.length > 0 && (
                  <div className="rounded-md border bg-muted/30">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="h-8 text-xs">Material</TableHead>
                          <TableHead className="h-8 text-right text-xs">Qty</TableHead>
                          <TableHead className="h-8 text-right text-xs">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {r.materials.map((m) => (
                          <TableRow key={`${m.materialName}-${m.unit}`}>
                            <TableCell className="py-1.5 text-sm">{m.materialName}</TableCell>
                            <TableCell className="py-1.5 text-right text-sm tabular-nums">
                              {formatNumber(m.quantity)} {m.unit}
                            </TableCell>
                            <TableCell className="py-1.5 text-right text-sm tabular-nums">
                              {formatInr(m.value)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
