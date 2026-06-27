import { useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Pencil,
  GitMerge,
  Trash2,
  Plus,
  Phone,
  MapPin,
  Truck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useLedger } from "@/hooks/useLedger";
import { useCollectionData } from "@/hooks/useCollectionData";
import type { Material, Site } from "@/lib/types";
import { materialsQuery } from "@/services/materials";
import { sitesQuery } from "@/services/sites";
import { deleteSupplier } from "@/services/suppliers";
import { formatInr, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DeliveryAdminDialog } from "@/components/dialogs/DeliveryAdminDialog";
import { PaymentDialog } from "@/components/dialogs/PaymentDialog";
import { SupplierEditDialog } from "@/components/dialogs/SupplierEditDialog";
import { MergeSupplierDialog } from "@/components/dialogs/MergeSupplierDialog";

function safeDate(value: string): string {
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { suppliers, deliveries, payments, financialsById, perSupplier, loading } = useLedger();
  const mQuery = useMemo(() => materialsQuery(), []);
  const siteQ = useMemo(() => sitesQuery(), []);
  const { data: materials } = useCollectionData<Material>(mQuery);
  const { data: sites } = useCollectionData<Site>(siteQ);

  const supplier = suppliers.find((s) => s.id === id);
  const totals = perSupplier.find((t) => t.supplierId === id);
  const myDeliveries = useMemo(
    () => deliveries.filter((d) => d.supplierId === id),
    [deliveries, id],
  );
  const myPayments = useMemo(() => payments.filter((p) => p.supplierId === id), [payments, id]);
  const others = useMemo(() => suppliers.filter((s) => s.id !== id), [suppliers, id]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!supplier || !totals) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/suppliers")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Suppliers
        </Button>
        <p className="py-8 text-center text-sm text-muted-foreground">Supplier not found.</p>
      </div>
    );
  }

  const canDelete = totals.deliveryCount === 0 && myPayments.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/suppliers")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Suppliers
        </Button>
        <div className="flex items-center gap-1">
          <SupplierEditDialog
            supplier={supplier}
            trigger={
              <Button variant="ghost" size="icon" aria-label="Edit supplier">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          {others.length > 0 && (
            <MergeSupplierDialog
              source={supplier}
              others={others}
              onMerged={(targetId) => navigate(`/suppliers/${targetId}`)}
              trigger={
                <Button variant="ghost" size="icon" aria-label="Merge supplier">
                  <GitMerge className="h-4 w-4" />
                </Button>
              }
            />
          )}
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon" aria-label="Delete supplier" disabled={!canDelete}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            }
            title={`Delete ${supplier.name}?`}
            description="Only suppliers with no deliveries or payments can be deleted. Use Merge to combine duplicates."
            confirmLabel="Delete"
            destructive
            onConfirm={async () => {
              await deleteSupplier(supplier.id);
              toast.success("Supplier deleted");
              navigate("/suppliers");
            }}
          />
        </div>
      </div>

      {/* Balance summary */}
      <Card>
        <CardContent className="p-4">
          <h1 className="text-lg font-semibold">{supplier.name}</h1>
          {(supplier.phone || supplier.address) && (
            <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
              {supplier.phone && (
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {supplier.phone}
                </p>
              )}
              {supplier.address && (
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {supplier.address}
                </p>
              )}
            </div>
          )}
          <Separator className="my-3" />
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-semibold tabular-nums">{formatInr(totals.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Given</p>
              <p className="font-semibold tabular-nums">{formatInr(totals.given)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="font-semibold tabular-nums text-amber-700">{formatInr(totals.balance)}</p>
            </div>
          </div>
          {totals.unpricedCount > 0 && (
            <p className="mt-2 text-center text-xs text-amber-600">
              {totals.unpricedCount} delivery(ies) still need a price.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Deliveries */}
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4" />
        <h2 className="font-semibold">Deliveries</h2>
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link to="/deliveries/new">
            <Plus className="mr-1 h-4 w-4" /> Add
          </Link>
        </Button>
      </div>
      {myDeliveries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deliveries for this supplier.</p>
      ) : (
        <div className="space-y-2">
          {myDeliveries.map((d) => {
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
                        <p className="truncate font-medium">{d.materialName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(d.quantity)} {d.unit} · {safeDate(d.date)}
                        </p>
                        {d.siteName && (
                          <p className="truncate text-xs text-muted-foreground">{d.siteName}</p>
                        )}
                      </div>
                      {fin ? (
                        <p className="font-semibold tabular-nums">{formatInr(fin.lineTotal)}</p>
                      ) : (
                        <Badge variant="outline" className="border-amber-400 text-amber-700">
                          Set price
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                }
              />
            );
          })}
        </div>
      )}

      {/* Payments */}
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4" />
        <h2 className="font-semibold">Payments</h2>
        <PaymentDialog
          suppliers={suppliers}
          perSupplier={perSupplier}
          defaultSupplierId={supplier.id}
          lockSupplier
          trigger={
            <Button variant="ghost" size="sm" className="ml-auto">
              <Plus className="mr-1 h-4 w-4" /> Record
            </Button>
          }
        />
      </div>
      {myPayments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments recorded.</p>
      ) : (
        <div className="space-y-2">
          {myPayments.map((p) => (
            <PaymentDialog
              key={p.id}
              suppliers={suppliers}
              perSupplier={perSupplier}
              payment={p}
              lockSupplier
              trigger={
                <Card className="cursor-pointer transition-colors hover:bg-accent">
                  <CardContent className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="font-medium tabular-nums">{formatInr(p.amount)}</p>
                      {p.note && <p className="truncate text-sm text-muted-foreground">{p.note}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground">{safeDate(p.date)}</p>
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
