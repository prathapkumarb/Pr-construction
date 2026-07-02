import { useMemo, useState } from "react";
import { BarChart3, Download, Loader2, IndianRupee, Wallet, Settings2, List, HardHat } from "lucide-react";
import { format as fmtDate, parseISO, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useLedger } from "@/hooks/useLedger";
import { useCollectionData } from "@/hooks/useCollectionData";
import { buildRange, computeReport, type PeriodPreset } from "@/lib/reports";
import type { LabourAttendance, LabourPayment } from "@/lib/labourTypes";
import { labourAttendanceQuery, labourPaymentsQuery } from "@/services/labour";
import { exportReportToExcel } from "@/lib/export";
import { formatInr, formatNumber } from "@/lib/format";
import type { UserDoc } from "@/lib/types";
import { usersQuery } from "@/services/users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "fortnight", label: "Bi-monthly" },
  { value: "month", label: "Month" },
  { value: "custom", label: "Custom" },
];

interface ReportPrefs {
  // Top-level sections
  showSummary: boolean;
  showTrend: boolean;
  showBySupplier: boolean;
  showByMaterial: boolean;
  showDeliveryLog: boolean;
  // Columns inside each supplier card
  showBalance: boolean;
  showPurchases: boolean;
  showPaid: boolean;
  showMaterialBreakdown: boolean;
  showMatQty: boolean;
  showMatPrice: boolean;
  showMatValue: boolean;
  // Delivery log columns
  showDLDate: boolean;
  showDLSupplier: boolean;
  showDLSite: boolean;
  showDLMaterial: boolean;
  showDLQty: boolean;
  showDLRate: boolean;
  showDLValue: boolean;
  showDLPaid: boolean;
  showDLBalance: boolean;
  showDLAddedBy: boolean;
}

const DEFAULT_PREFS: ReportPrefs = {
  showSummary: true,
  showTrend: true,
  showBySupplier: true,
  showByMaterial: true,
  showDeliveryLog: true,
  showBalance: true,
  showPurchases: true,
  showPaid: true,
  showMaterialBreakdown: true,
  showMatQty: true,
  showMatPrice: true,
  showMatValue: true,
  showDLDate: true,
  showDLSupplier: true,
  showDLSite: true,
  showDLMaterial: true,
  showDLQty: true,
  showDLRate: true,
  showDLValue: true,
  showDLPaid: true,
  showDLBalance: true,
  showDLAddedBy: true,
};

function loadPrefs(key: string): ReportPrefs {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_PREFS };
}

function savePrefs(key: string, prefs: ReportPrefs) {
  localStorage.setItem(key, JSON.stringify(prefs));
}

function safeDate(value: string): string {
  try { return fmtDate(parseISO(value), "dd MMM yyyy"); } catch { return value; }
}

export default function ReportsPage() {
  const { firebaseUser } = useAuth();
  const PREFS_KEY = `flux_report_prefs_${firebaseUser?.uid ?? "guest"}`;

  const { deliveries, financials, payments, suppliers, perSupplier, loading } = useLedger();
  const uQ = useMemo(() => usersQuery(), []);
  const { data: users } = useCollectionData<UserDoc>(uQ);
  const laQ = useMemo(() => labourAttendanceQuery(), []);
  const lpQ = useMemo(() => labourPaymentsQuery(), []);
  const { data: labourAttendance } = useCollectionData<LabourAttendance>(laQ);
  const { data: labourPayments } = useCollectionData<LabourPayment>(lpQ);

  // u.id is the injected Firestore doc ID (= Firebase UID) — always reliable
  const userNames = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);

  const [preset, setPreset] = useState<PeriodPreset>("month");
  const today = useMemo(() => new Date(), []);
  const [customStart, setCustomStart] = useState(fmtDate(startOfMonth(today), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(fmtDate(today, "yyyy-MM-dd"));
  const [supplierId, setSupplierId] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [prefs, setPrefs] = useState<ReportPrefs>(() => loadPrefs(PREFS_KEY));

  function updatePref<K extends keyof ReportPrefs>(key: K, value: ReportPrefs[K]) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      savePrefs(PREFS_KEY, next);
      return next;
    });
  }

  const supplierNames = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);
  // Lifetime totals per supplier (given = total paid, balance = outstanding)
  const supplierTotalsMap = useMemo(
    () => new Map(perSupplier.map((s) => [s.supplierId, s])),
    [perSupplier],
  );

  const report = useMemo(() => {
    const range = buildRange(preset, today, { start: customStart, end: customEnd });
    return computeReport(
      { deliveries, financials, payments, supplierNames, perSupplier },
      range,
      { supplierId: supplierId === "all" ? undefined : supplierId },
    );
  }, [preset, today, customStart, customEnd, supplierId, deliveries, financials, payments, supplierNames, perSupplier]);

  // Flat delivery log: deliveries in the period joined with financials
  const financialsById = useMemo(() => new Map(financials.map((f) => [f.id, f])), [financials]);
  const periodDeliveries = useMemo(() => {
    let list = deliveries.filter((d) => d.date >= report.range.start && d.date <= report.range.end);
    if (supplierId !== "all") list = list.filter((d) => d.supplierId === supplierId);
    return list.slice().sort((a, b) => b.date.localeCompare(a.date));
  }, [deliveries, report.range, supplierId]);

  async function handleExport() {
    setExporting(true);
    try {
      const logRows = periodDeliveries.map((d) => {
        const fin = financialsById.get(d.id);
        const st = supplierTotalsMap.get(d.supplierId);
        return {
          Date: d.date,
          Supplier: d.supplierName,
          Site: d.siteName ?? "",
          Material: d.materialName,
          Unit: d.unit,
          Qty: d.quantity,
          "Rate (₹)": fin && typeof d.quantity === "number" && d.quantity > 0 ? Math.round((fin.lineTotal / d.quantity) * 100) / 100 : "",
          "Value (₹)": fin ? fin.lineTotal : "",
          "Paid (₹)": st?.given ?? 0,
          "Balance (₹)": st?.balance ?? 0,
          "Added by": userNames.get(d.createdBy) ?? d.createdBy,
        };
      });
      await exportReportToExcel(report, logRows);
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

  const toggleGroups = [
    {
      label: "Sections",
      items: [
        { key: "showSummary", label: "Summary cards" },
        { key: "showTrend", label: "Trend chart" },
        { key: "showBySupplier", label: "By supplier" },
        { key: "showByMaterial", label: "By material" },
        { key: "showDeliveryLog", label: "Delivery log" },
      ],
    },
    {
      label: "Supplier columns",
      items: [
        { key: "showBalance", label: "Balance" },
        { key: "showPurchases", label: "Purchases" },
        { key: "showPaid", label: "Paid" },
        { key: "showMaterialBreakdown", label: "Material table" },
        { key: "showMatQty", label: "Qty column" },
        { key: "showMatPrice", label: "Price/unit column" },
        { key: "showMatValue", label: "Value column" },
      ],
    },
    {
      label: "Delivery log columns",
      items: [
        { key: "showDLDate", label: "Date" },
        { key: "showDLSupplier", label: "Supplier" },
        { key: "showDLSite", label: "Site" },
        { key: "showDLMaterial", label: "Material" },
        { key: "showDLQty", label: "Qty" },
        { key: "showDLRate", label: "Rate" },
        { key: "showDLValue", label: "Value" },
        { key: "showDLPaid", label: "Paid (total)" },
        { key: "showDLBalance", label: "Balance (total)" },
        { key: "showDLAddedBy", label: "Added by" },
      ],
    },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Reports</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={showCustomize ? "secondary" : "ghost"}
            onClick={() => setShowCustomize((v) => !v)}
            aria-label="Customize columns"
          >
            <Settings2 className="mr-1 h-4 w-4" />
            Columns
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
            Excel
          </Button>
        </div>
      </div>

      {/* Column customizer */}
      {showCustomize && (
        <Card>
          <CardContent className="space-y-4 p-3">
            {toggleGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={prefs[key] as boolean}
                        onChange={(e) => updatePref(key as keyof ReportPrefs, e.target.checked)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{report.range.start} → {report.range.end}</p>

      {/* Summary */}
      {prefs.showSummary && (
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
      )}

      {/* Trend chart */}
      {prefs.showTrend && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Purchases trend</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={report.trend} />
          </CardContent>
        </Card>
      )}

      {/* By supplier */}
      {prefs.showBySupplier && (
        <>
          <h2 className="text-sm font-semibold">By supplier</h2>
          {report.bySupplier.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data in period.</p>
          ) : (
            <div className="space-y-2">
              {report.bySupplier.map((r) => (
                <Card key={r.supplierId}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{r.name}</p>
                      {prefs.showBalance && (
                        <div className="text-right text-xs text-muted-foreground">
                          <span>Balance</span>
                          <p className="text-sm font-semibold tabular-nums text-amber-700">{formatInr(r.outstanding)}</p>
                        </div>
                      )}
                    </div>
                    {(prefs.showPurchases || prefs.showPaid) && (
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {prefs.showPurchases && <span>Purchases <span className="font-medium text-foreground tabular-nums">{formatInr(r.spend)}</span></span>}
                        {prefs.showPaid && <span>Paid <span className="font-medium text-foreground tabular-nums">{formatInr(r.payments)}</span></span>}
                      </div>
                    )}
                    {prefs.showMaterialBreakdown && r.materials.length > 0 && (
                      <div className="rounded-md border bg-muted/30">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="h-8 text-xs">Material</TableHead>
                              {prefs.showMatQty && <TableHead className="h-8 text-right text-xs">Qty</TableHead>}
                              {prefs.showMatPrice && <TableHead className="h-8 text-right text-xs">Rate</TableHead>}
                              {prefs.showMatValue && <TableHead className="h-8 text-right text-xs">Value</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {r.materials.map((m) => {
                              const rate = m.quantity > 0 ? m.value / m.quantity : 0;
                              return (
                                <TableRow key={`${m.materialName}-${m.unit}`}>
                                  <TableCell className="py-1.5 text-sm">{m.materialName}</TableCell>
                                  {prefs.showMatQty && (
                                    <TableCell className="py-1.5 text-right text-sm tabular-nums">
                                      {formatNumber(m.quantity)} {m.unit}
                                    </TableCell>
                                  )}
                                  {prefs.showMatPrice && (
                                    <TableCell className="py-1.5 text-right text-sm tabular-nums">
                                      {rate > 0 ? formatInr(rate) : <span className="text-muted-foreground">—</span>}
                                    </TableCell>
                                  )}
                                  {prefs.showMatValue && (
                                    <TableCell className="py-1.5 text-right text-sm tabular-nums">
                                      {formatInr(m.value)}
                                    </TableCell>
                                  )}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* By material */}
      {prefs.showByMaterial && (
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
                      <TableCell className="text-right tabular-nums">{formatNumber(r.quantity)} {r.unit}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatInr(r.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delivery log */}
      {prefs.showDeliveryLog && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <List className="h-4 w-4" />
              <CardTitle className="text-sm">
                Delivery log
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {periodDeliveries.length} record{periodDeliveries.length !== 1 ? "s" : ""}
                </span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            {periodDeliveries.length === 0 ? (
              <p className="px-6 pb-2 text-sm text-muted-foreground">No deliveries in period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      {prefs.showDLDate && <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>}
                      {prefs.showDLSupplier && <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">Supplier</th>}
                      {prefs.showDLSite && <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">Site</th>}
                      {prefs.showDLMaterial && <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">Material</th>}
                      {prefs.showDLQty && <th className="whitespace-nowrap px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qty</th>}
                      {prefs.showDLRate && <th className="whitespace-nowrap px-3 py-2 text-right text-xs font-medium text-muted-foreground">Rate</th>}
                      {prefs.showDLValue && <th className="whitespace-nowrap px-3 py-2 text-right text-xs font-medium text-muted-foreground">Value</th>}
                      {prefs.showDLPaid && <th className="whitespace-nowrap px-3 py-2 text-right text-xs font-medium text-muted-foreground">Paid</th>}
                      {prefs.showDLBalance && <th className="whitespace-nowrap px-3 py-2 text-right text-xs font-medium text-muted-foreground">Balance</th>}
                      {prefs.showDLAddedBy && <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-muted-foreground">Added by</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {periodDeliveries.map((d) => {
                      const fin = financialsById.get(d.id);
                      const rate = fin && typeof d.quantity === "number" && d.quantity > 0 ? fin.lineTotal / d.quantity : null;
                      const st = supplierTotalsMap.get(d.supplierId);
                      return (
                        <tr key={d.id} className="border-b last:border-0 hover:bg-muted/20">
                          {prefs.showDLDate && (
                            <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{safeDate(d.date)}</td>
                          )}
                          {prefs.showDLSupplier && (
                            <td className="whitespace-nowrap px-3 py-2 font-medium">{d.supplierName}</td>
                          )}
                          {prefs.showDLSite && (
                            <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                              {d.siteName ?? <span className="text-xs">—</span>}
                            </td>
                          )}
                          {prefs.showDLMaterial && (
                            <td className="whitespace-nowrap px-3 py-2">{d.materialName}</td>
                          )}
                          {prefs.showDLQty && (
                            <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                              {formatNumber(d.quantity)} <span className="text-xs text-muted-foreground">{d.unit}</span>
                            </td>
                          )}
                          {prefs.showDLRate && (
                            <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                              {rate != null ? formatInr(rate) : (
                                <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700">unpriced</Badge>
                              )}
                            </td>
                          )}
                          {prefs.showDLValue && (
                            <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                              {fin ? formatInr(fin.lineTotal) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          )}
                          {prefs.showDLPaid && (
                            <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-muted-foreground">
                              {formatInr(st?.given ?? 0)}
                            </td>
                          )}
                          {prefs.showDLBalance && (
                            <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums font-medium text-amber-700">
                              {formatInr(st?.balance ?? 0)}
                            </td>
                          )}
                          {prefs.showDLAddedBy && (
                            <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                              {userNames.get(d.createdBy) ?? d.createdBy.slice(0, 6)}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Labour section ──────────────────────────────────────────────────── */}
      {(() => {
        const { start, end } = report.range;
        const periodAttendance = labourAttendance.filter(
          (r) => r.date >= start && r.date <= end,
        );
        const periodLabourPayments = labourPayments.filter(
          (p) => p.date >= start && p.date <= end,
        );

        if (periodAttendance.length === 0 && periodLabourPayments.length === 0) return null;

        // Per-worker attendance summary
        const workerStats = new Map<string, { name: string; present: number; absent: number; ot: number }>();
        for (const r of periodAttendance) {
          const s = workerStats.get(r.workerId) ?? { name: r.workerName, present: 0, absent: 0, ot: 0 };
          if (r.attendance === "present") s.present += 1;
          else s.absent += 1;
          s.ot += r.ot;
          workerStats.set(r.workerId, s);
        }
        const statsRows = [...workerStats.values()].sort((a, b) => a.name.localeCompare(b.name));

        return (
          <>
            <div className="flex items-center gap-2 pt-2">
              <HardHat className="h-4 w-4" />
              <h2 className="text-sm font-semibold">Labour</h2>
            </div>

            {statsRows.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Attendance summary</CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Worker</TableHead>
                        <TableHead className="text-right">Present</TableHead>
                        <TableHead className="text-right">Absent</TableHead>
                        <TableHead className="text-right">OT days</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statsRows.map((s) => (
                        <TableRow key={s.name}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-right tabular-nums text-emerald-700">{s.present}</TableCell>
                          <TableCell className="text-right tabular-nums text-destructive">{s.absent}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.ot}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {periodLabourPayments.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Labour advances</CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Worker</TableHead>
                        <TableHead className="text-right">Advance</TableHead>
                        <TableHead className="text-right">Rate/day</TableHead>
                        <TableHead className="text-right">Deducted</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periodLabourPayments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            <p>{p.workerName}</p>
                            <p className="text-xs text-muted-foreground">{safeDate(p.date)}</p>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatInr(p.advance)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatInr(p.ratePerDay)}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{formatInr(p.deducted)}</TableCell>
                          <TableCell className="text-right tabular-nums text-amber-700">
                            {formatInr(p.advance - p.deducted)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        );
      })()}
    </div>
  );
}
