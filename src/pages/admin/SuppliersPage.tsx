import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ChevronRight, Search } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { formatInr } from "@/lib/format";
import { normalizeName } from "@/lib/fuzzy";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function SuppliersPage() {
  const { perSupplier, loading } = useLedger();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = normalizeName(search);
    if (!q) return perSupplier;
    return perSupplier.filter((s) => normalizeName(s.name).includes(q));
  }, [perSupplier, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Suppliers</h1>
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
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No suppliers found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <Card
              key={s.supplierId}
              className="cursor-pointer transition-colors hover:bg-accent"
              onClick={() => navigate(`/suppliers/${s.supplierId}`)}
            >
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
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
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
