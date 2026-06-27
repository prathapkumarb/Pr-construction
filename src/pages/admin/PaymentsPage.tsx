import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Wallet, Plus } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { formatInr } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentDialog } from "@/components/dialogs/PaymentDialog";

function safeDate(value: string): string {
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

export default function PaymentsPage() {
  const { suppliers, payments, perSupplier, loading } = useLedger();
  const nameById = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s.name])),
    [suppliers],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Payments</h1>
        </div>
        <PaymentDialog
          suppliers={suppliers}
          perSupplier={perSupplier}
          trigger={
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Record
            </Button>
          }
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <PaymentDialog
              key={p.id}
              suppliers={suppliers}
              perSupplier={perSupplier}
              payment={p}
              trigger={
                <Card className="cursor-pointer transition-colors hover:bg-accent">
                  <CardContent className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{nameById.get(p.supplierId) ?? "Unknown supplier"}</p>
                      {p.note && <p className="truncate text-sm text-muted-foreground">{p.note}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">{formatInr(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">{safeDate(p.date)}</p>
                    </div>
                  </CardContent>
                </Card>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
