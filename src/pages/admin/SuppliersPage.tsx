import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ChevronRight, Search, Plus, PowerOff, Power } from "lucide-react";
import { toast } from "sonner";
import { useLedger } from "@/hooks/useLedger";
import { setSupplierActive } from "@/services/suppliers";
import { formatInr } from "@/lib/format";
import { normalizeName } from "@/lib/fuzzy";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SupplierEditDialog } from "@/components/dialogs/SupplierEditDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function SuppliersPage() {
  const { perSupplier, suppliers, loading } = useLedger();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const activeById = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s.active !== false])),
    [suppliers],
  );
  const filtered = useMemo(() => {
    const q = normalizeName(search);
    if (!q) return perSupplier;
    return perSupplier.filter((s) => normalizeName(s.name).includes(q));
  }, [perSupplier, search]);

  const activeRows = filtered.filter((s) => activeById.get(s.supplierId) !== false);
  const inactiveRows = filtered.filter((s) => activeById.get(s.supplierId) === false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Suppliers</h1>
        </div>
        <SupplierEditDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          }
        />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search suppliers"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : activeRows.length === 0 && inactiveRows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No suppliers found.</p>
      ) : (
        <div className="space-y-2">
          {activeRows.map((s) => (
            <Card
              key={s.supplierId}
              className="cursor-pointer transition-colors hover:bg-accent"
              onClick={() => navigate(`/records/suppliers/${s.supplierId}`)}
            >
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.deliveryCount} deliver{s.deliveryCount === 1 ? "y" : "ies"}
                    {s.unpricedCount > 0 && (
                      <span className="ml-1 text-amber-600">· {s.unpricedCount} unpriced</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="font-semibold tabular-nums">{formatInr(s.balance)}</p>
                  </div>
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Deactivate supplier"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <PowerOff className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    }
                    title={`Deactivate ${s.name}?`}
                    description="They will be hidden from pickers. Existing records are kept. You can reactivate anytime."
                    confirmLabel="Deactivate"
                    onConfirm={async () => {
                      await setSupplierActive(s.supplierId, false);
                      toast.success(`${s.name} deactivated`);
                    }}
                  />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}

          {inactiveRows.length > 0 && (
            <>
              <button
                className="w-full text-left text-xs font-medium text-muted-foreground py-1"
                onClick={() => setShowInactive((v) => !v)}
              >
                {showInactive ? "▾" : "▸"} {inactiveRows.length} inactive supplier{inactiveRows.length > 1 ? "s" : ""}
              </button>
              {showInactive &&
                inactiveRows.map((s) => (
                  <Card
                    key={s.supplierId}
                    className="cursor-pointer opacity-60 transition-colors hover:bg-accent"
                    onClick={() => navigate(`/records/suppliers/${s.supplierId}`)}
                  >
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{s.name}</p>
                          <Badge variant="outline" className="text-[10px]">inactive</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {s.deliveryCount} deliver{s.deliveryCount === 1 ? "y" : "ies"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Reactivate supplier"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await setSupplierActive(s.supplierId, true);
                            toast.success(`${s.name} reactivated`);
                          }}
                        >
                          <Power className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
