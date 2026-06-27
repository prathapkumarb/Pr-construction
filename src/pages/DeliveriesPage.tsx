import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Plus, Truck } from "lucide-react";
import { useCollectionData } from "@/hooks/useCollectionData";
import type { Delivery } from "@/lib/types";
import { deliveriesQuery } from "@/services/deliveries";
import { formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DeliveriesPage() {
  const query = useMemo(() => deliveriesQuery(), []);
  const { data: deliveries, loading } = useCollectionData<Delivery>(query);

  return (
    <div className="space-y-4">
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

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : deliveries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Truck className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No deliveries yet.</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/deliveries/new">Record the first one</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {deliveries.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{d.supplierName}</p>
                  <p className="truncate text-sm text-muted-foreground">{d.materialName}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">
                    {formatNumber(d.quantity)} <span className="text-xs font-normal">{d.unit}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {safeDate(d.date)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function safeDate(value: string): string {
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}
