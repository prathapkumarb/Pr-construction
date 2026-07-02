import { useEffect, useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { Loader2, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import type { LabourAttendance, LabourPayment, LabourRate, LabourWorker } from "@/lib/labourTypes";
import {
  createLabourPayment,
  updateLabourPayment,
  deleteLabourPayment,
  createLabourRate,
  updateLabourWorker,
  labourAttendanceByWorkerQuery,
  labourRatesByWorkerQuery,
} from "@/services/labour";
import { useCollectionData } from "@/hooks/useCollectionData";
import { formatInr } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  trigger: ReactNode;
  workers: LabourWorker[];
  payment?: LabourPayment; // omit to create
  defaultWorkerId?: string;
}

/** Returns the rate effective on a given date from sorted (asc) rate history. */
function rateForDate(
  date: string,
  sortedRates: LabourRate[],
  fallback: number,
): number {
  let rate = fallback;
  for (const r of sortedRates) {
    if (r.effectiveFrom <= date) rate = r.ratePerDay;
    else break;
  }
  return rate;
}

interface EarningsSummary {
  presentDays: number;
  otDays: number;
  totalEarned: number;
}

function calcEarnings(
  attendance: LabourAttendance[],
  sortedRates: LabourRate[],
  fallbackRate: number,
): EarningsSummary {
  let presentDays = 0;
  let otDays = 0;
  let totalEarned = 0;
  for (const rec of attendance) {
    if (rec.attendance !== "present") continue;
    presentDays += 1;
    otDays += rec.ot;
    const rate = rateForDate(rec.date, sortedRates, fallbackRate);
    totalEarned += (1 + rec.ot) * rate;
  }
  return { presentDays, otDays, totalEarned };
}

export function LabourPaymentDialog({
  trigger,
  workers,
  payment,
  defaultWorkerId,
}: Props) {
  const { firebaseUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [workerId, setWorkerId] = useState("");
  const [ratePerDay, setRatePerDay] = useState("");
  const [advance, setAdvance] = useState("");
  const [deducted, setDeducted] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");
  const [saveRateToHistory, setSaveRateToHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);

  // ── Load worker's attendance + rate history when dialog is open ──────────────
  const attQ = useMemo(
    () => (open && workerId ? labourAttendanceByWorkerQuery(workerId) : null),
    [open, workerId],
  );
  const ratesQ = useMemo(
    () => (open && workerId ? labourRatesByWorkerQuery(workerId) : null),
    [open, workerId],
  );
  const { data: workerAttendance, loading: attLoading } =
    useCollectionData<LabourAttendance>(attQ);
  const { data: workerRates } = useCollectionData<LabourRate>(ratesQ);

  // ── Populate form on open ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const wid = payment?.workerId ?? defaultWorkerId ?? "";
    setWorkerId(wid);
    setAdvance(payment ? String(payment.advance) : "");
    setDeducted(payment ? String(payment.deducted ?? 0) : "0");
    setDate(payment?.date ?? format(new Date(), "yyyy-MM-dd"));
    setNote(payment?.note ?? "");
    setSaveRateToHistory(false);
    setAttempted(false);

    if (payment) {
      setRatePerDay(String(payment.ratePerDay));
    } else {
      // Pre-fill from worker profile
      const w = workers.find((w) => w.id === wid);
      setRatePerDay(w?.ratePerDay != null ? String(w.ratePerDay) : "");
    }
  }, [open, payment, defaultWorkerId, workers]);

  // When worker changes (create mode), pre-fill rate from profile
  useEffect(() => {
    if (!open || payment) return;
    const w = workers.find((w) => w.id === workerId);
    setRatePerDay(w?.ratePerDay != null ? String(w.ratePerDay) : "");
  }, [workerId, open, payment, workers]);

  // ── Derived values ────────────────────────────────────────────────────────────
  const rateNum = Number(ratePerDay) || 0;
  const advanceNum = Number(advance) || 0;
  const deductedNum = Number(deducted) || 0;
  const remaining = advanceNum - deductedNum;

  const selectedWorker = workers.find((w) => w.id === workerId);
  const workerCurrentRate = selectedWorker?.ratePerDay;
  const rateChanged =
    rateNum > 0 && workerCurrentRate != null && rateNum !== workerCurrentRate;

  const { presentDays, otDays, totalEarned } = useMemo(
    () => calcEarnings(workerAttendance, workerRates, rateNum),
    [workerAttendance, workerRates, rateNum],
  );
  const netBalance = totalEarned - advanceNum;

  const valid =
    workerId &&
    advance !== "" &&
    advanceNum >= 0 &&
    deductedNum >= 0 &&
    date;

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function save() {
    setAttempted(true);
    if (!valid) return;
    setBusy(true);
    try {
      const uid = firebaseUser!.uid;
      const workerName = selectedWorker?.name ?? payment?.workerName ?? "";
      const input = {
        workerId,
        workerName,
        ratePerDay: rateNum,
        advance: advanceNum,
        deducted: deductedNum,
        date,
        note: note.trim() || undefined,
      };

      if (payment) {
        await updateLabourPayment(payment.id, input);
        toast.success("Advance updated");
      } else {
        await createLabourPayment(input, uid);
        toast.success("Advance recorded");
      }

      // Optionally save new rate to worker's history
      if (saveRateToHistory && rateNum > 0) {
        const today = new Date().toISOString().split("T")[0];
        await createLabourRate({ workerId, workerName, ratePerDay: rateNum, effectiveFrom: today }, uid);
        await updateLabourWorker(workerId, { name: workerName, ratePerDay: rateNum });
      }

      setOpen(false);
    } catch (err) {
      console.error("LabourPaymentDialog save failed:", err);
      toast.error("Could not save advance");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!payment) return;
    setBusy(true);
    try {
      await deleteLabourPayment(payment.id);
      toast.success("Advance deleted");
      setOpen(false);
    } catch {
      toast.error("Could not delete advance");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{payment ? "Edit advance" : "Record advance"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Worker */}
          <div className="space-y-1.5">
            <Label>Worker</Label>
            <Select value={workerId} onValueChange={setWorkerId} disabled={!!payment}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select worker" />
              </SelectTrigger>
              <SelectContent>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                    {w.role ? ` — ${w.role}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {attempted && !workerId && (
              <p className="text-xs text-destructive">Worker is required</p>
            )}
          </div>

          {/* Rate per day */}
          <div className="space-y-1.5">
            <Label htmlFor="lp-rate">Rate per day (₹)</Label>
            <Input
              id="lp-rate"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={ratePerDay}
              onChange={(e) => setRatePerDay(e.target.value)}
              className="h-11"
              placeholder="e.g. 500"
            />
            {ratePerDay === "" && workerId && (
              <p className="text-xs text-muted-foreground">
                Enter rate to calculate earnings. You can set a default in the worker profile.
              </p>
            )}
            {rateChanged && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="font-medium">
                  Rate changed: {formatInr(workerCurrentRate!)} → {formatInr(rateNum)}/day
                </p>
                <label className="mt-1.5 flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={saveRateToHistory}
                    onChange={(e) => setSaveRateToHistory(e.target.checked)}
                    className="rounded"
                  />
                  Save as new rate effective today (updates worker profile)
                </label>
              </div>
            )}
          </div>

          {/* Earnings summary */}
          {workerId && (
            <div className="rounded-md bg-muted/50 px-3 py-2.5 text-sm">
              <p className="flex items-center gap-1.5 font-medium text-foreground mb-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Earnings summary
              </p>
              {attLoading ? (
                <p className="text-xs text-muted-foreground">Loading attendance…</p>
              ) : (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Days present</span>
                    <span className="font-medium text-foreground">{presentDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>OT days</span>
                    <span className="font-medium text-foreground">{otDays}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span>Total earned ({presentDays + otDays} equiv. days)</span>
                    <span className="font-semibold text-foreground">{formatInr(totalEarned)}</span>
                  </div>
                  {advanceNum > 0 && (
                    <div className="flex justify-between font-medium">
                      <span>Net balance (earned − advance)</span>
                      <span className={netBalance >= 0 ? "text-emerald-600" : "text-destructive"}>
                        {formatInr(netBalance)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Advance + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lp-advance">Advance (₹)</Label>
              <Input
                id="lp-advance"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={advance}
                onChange={(e) => setAdvance(e.target.value)}
                className="h-11"
              />
              {attempted && (advance === "" || advanceNum < 0) && (
                <p className="text-xs text-destructive">Enter advance amount</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lp-date">Advance date</Label>
              <Input
                id="lp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11"
              />
              {attempted && !date && (
                <p className="text-xs text-destructive">Date is required</p>
              )}
            </div>
          </div>

          {/* Deducted + Remaining */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lp-deducted">Deducted (₹)</Label>
              <Input
                id="lp-deducted"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={deducted}
                onChange={(e) => setDeducted(e.target.value)}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">Amount recovered so far</p>
            </div>
            <div className="space-y-1.5">
              <Label>Remaining advance (₹)</Label>
              <div className="flex h-11 items-center rounded-md border bg-muted/40 px-3 text-sm tabular-nums">
                {remaining < 0 ? (
                  <span className="text-destructive">{formatInr(remaining)}</span>
                ) : (
                  <span>{formatInr(remaining)}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Advance − deducted</p>
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="lp-note">Note (optional)</Label>
            <Input
              id="lp-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-11"
            />
          </div>
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          {payment ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={remove}
              disabled={busy}
              aria-label="Delete advance"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {payment ? "Save" : "Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
