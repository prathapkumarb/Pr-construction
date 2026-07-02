import { useEffect, useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import type { Payment, Supplier } from "@/lib/types";
import type { SupplierTotals } from "@/lib/ledger";
import { createPayment, updatePayment, deletePayment } from "@/services/payments";
import { formatInr } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  trigger: ReactNode;
  suppliers: Supplier[];
  /** Existing payment to edit; omit to create. */
  payment?: Payment;
  /** Pre-select a supplier (e.g. on a supplier detail page). */
  defaultSupplierId?: string;
  /** Lock the supplier field (when recording from a supplier's page). */
  lockSupplier?: boolean;
  /** Ledger totals per supplier — used to show balance info. */
  perSupplier?: SupplierTotals[];
}

export function PaymentDialog({
  trigger,
  suppliers,
  payment,
  defaultSupplierId,
  lockSupplier,
  perSupplier = [],
}: Props) {
  const { firebaseUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSupplierId(payment?.supplierId ?? defaultSupplierId ?? "");
    setAmount(payment ? String(payment.amount) : "");
    setDate(payment?.date ?? format(new Date(), "yyyy-MM-dd"));
    setNote(payment?.note ?? "");
    setAttempted(false);
  }, [open, payment, defaultSupplierId]);

  const totalsMap = useMemo(
    () => new Map(perSupplier.map((t) => [t.supplierId, t])),
    [perSupplier],
  );
  const selectedTotals = supplierId ? totalsMap.get(supplierId) : undefined;

  const amountNum = Number(amount);
  const valid = supplierId && amount !== "" && amountNum > 0 && date;

  async function save() {
    setAttempted(true);
    if (!valid) return;
    setBusy(true);
    try {
      const input = { supplierId, amount: amountNum, date, note: note.trim() };
      if (payment) await updatePayment(payment.id, input);
      else await createPayment(input, firebaseUser!.uid);
      toast.success(payment ? "Payment updated" : "Payment recorded");
      setOpen(false);
    } catch {
      toast.error("Could not save payment");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!payment) return;
    setBusy(true);
    try {
      await deletePayment(payment.id);
      toast.success("Payment deleted");
      setOpen(false);
    } catch {
      toast.error("Could not delete payment");
    } finally {
      setBusy(false);
    }
  }

  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.active !== false), [suppliers]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{payment ? "Edit payment" : "Record payment"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId} disabled={lockSupplier}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {activeSuppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {attempted && !supplierId && (
              <p className="text-xs text-destructive">Supplier is required</p>
            )}
          </div>

          {selectedTotals && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">{selectedTotals.name} — current balance</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground">Purchases</p>
                  <p className="text-sm font-semibold tabular-nums">{formatInr(selectedTotals.amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Paid</p>
                  <p className="text-sm font-semibold tabular-nums">{formatInr(selectedTotals.given)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Balance</p>
                  <p className="text-sm font-semibold tabular-nums text-amber-700">{formatInr(selectedTotals.balance)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11"
              />
              {attempted && (amount === "" || amountNum <= 0) && (
                <p className="text-xs text-destructive">Amount must be greater than 0</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdate">Date</Label>
              <Input
                id="pdate"
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
          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} className="h-11" />
          </div>
        </div>
        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          {payment ? (
            <Button variant="ghost" size="icon" onClick={remove} disabled={busy} aria-label="Delete">
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
