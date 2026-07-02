import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Wallet, Plus, Search } from "lucide-react";
import { useCollectionData } from "@/hooks/useCollectionData";
import type { LabourPayment, LabourWorker } from "@/lib/labourTypes";
import { labourPaymentsQuery, labourWorkersQuery } from "@/services/labour";
import { formatInr } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LabourPaymentDialog } from "@/components/dialogs/LabourPaymentDialog";

function safeDate(value: string) {
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

export default function LabourPaymentsPage() {
  const pQuery = useMemo(() => labourPaymentsQuery(), []);
  const wQuery = useMemo(() => labourWorkersQuery(), []);
  const { data: payments, loading } = useCollectionData<LabourPayment>(pQuery);
  const { data: workers } = useCollectionData<LabourWorker>(wQuery);

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) => p.workerName.toLowerCase().includes(q));
  }, [payments, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Advances</h1>
        </div>
        <LabourPaymentDialog
          workers={workers}
          trigger={
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Record
            </Button>
          }
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by worker name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {search ? "No records match your search." : "No advance records yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const remaining = p.advance - p.deducted;
            return (
              <LabourPaymentDialog
                key={p.id}
                workers={workers}
                payment={p}
                trigger={
                  <Card className="cursor-pointer transition-colors hover:bg-accent">
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{p.workerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatInr(p.ratePerDay)}/day · {safeDate(p.date)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold tabular-nums">{formatInr(p.advance)}</p>
                          <p className="text-xs text-muted-foreground">advance</p>
                        </div>
                      </div>

                      {/* Deduction row */}
                      <div className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 text-xs">
                        <span className="text-muted-foreground">
                          Deducted: <span className="font-medium text-foreground">{formatInr(p.deducted)}</span>
                        </span>
                        <span className={remaining > 0 ? "font-medium text-amber-700" : remaining < 0 ? "font-medium text-destructive" : "text-muted-foreground"}>
                          Remaining: {formatInr(remaining)}
                        </span>
                      </div>

                      {p.note && (
                        <p className="text-xs text-muted-foreground truncate">{p.note}</p>
                      )}
                    </CardContent>
                  </Card>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
