import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Plus, Truck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCollectionData } from "@/hooks/useCollectionData";
import { useLedger } from "@/hooks/useLedger";
import type { Delivery, Material, Site } from "@/lib/types";
import { deliveriesQuery } from "@/services/deliveries";
import { materialsQuery } from "@/services/materials";
import { sitesQuery } from "@/services/sites";
import { formatInr, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DeliveryAdminDialog } from "@/components/dialogs/DeliveryAdminDialog";

function safeDate(value: string): string {
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

function Header() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Deliveries</h1>
      </div>
      <Button asChild size="sm">
        <Link to="/deliveries/new">
          <Plus className="mr-1 h-4 w-4" /> Add
        </Link>
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
        <Truck className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No deliveries yet.</p>
        <Button asChild size="sm" variant="outline">
          <Link to="/deliveries/new">Record the first one</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function LoadingList() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

/** Supervisor view: physical facts only, no money. */
function SupervisorDeliveries() {
  const query = useMemo(() => deliveriesQuery(), []);
  const { data: deliveries, loading } = useCollectionData<Delivery>(query);

  return (
    <div className="space-y-4">
      <Header />
      {loading ? (
        <LoadingList />
      ) : deliveries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {deliveries.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{d.supplierName}</p>
                  <p className="truncate text-sm text-muted-foreground">{d.materialName}</p>
                  {d.siteName && (
                    <p className="truncate text-xs text-muted-foreground">{d.siteName}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">
                    {formatNumber(d.quantity)} <span className="text-xs font-normal">{d.unit}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{safeDate(d.date)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** Admin view: shows price/total and lets the admin edit/price/delete. */
function AdminDeliveries() {
  const { deliveries, financialsById, suppliers, loading } = useLedger();
  const mQuery = useMemo(() => materialsQuery(), []);
  const siteQ = useMemo(() => sitesQuery(), []);
  const { data: materials } = useCollectionData<Material>(mQuery);
  const { data: sites } = useCollectionData<Site>(siteQ);

  return (
    <div className="space-y-4">
      <Header />
      {loading ? (
        <LoadingList />
      ) : deliveries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {deliveries.map((d) => {
            const fin = financialsById.get(d.id);
            return (
              <DeliveryAdminDialog
                key={d.id}
                delivery={d}
                financial={fin}
                suppliers={suppliers}
                materials={materials}
                sites={sites}
                trigger={
                  <Card className="cursor-pointer transition-colors hover:bg-accent">
                    <CardContent className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{d.supplierName}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {d.materialName} · {formatNumber(d.quantity)} {d.unit}
                        </p>
                        {d.siteName && (
                          <p className="truncate text-xs text-muted-foreground">{d.siteName}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {fin ? (
                          <p className="font-semibold tabular-nums">{formatInr(fin.lineTotal)}</p>
                        ) : (
                          <Badge variant="outline" className="border-amber-400 text-amber-700">
                            Set price
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground">{safeDate(d.date)}</p>
                      </div>
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

export default function DeliveriesPage() {
  const { role } = useAuth();
  return role === "admin" ? <AdminDeliveries /> : <SupervisorDeliveries />;
}
