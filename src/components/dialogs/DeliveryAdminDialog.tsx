import { useEffect, useState, type ReactNode } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Delivery, DeliveryFinancial, Material, Supplier } from "@/lib/types";
import { updateDelivery, deleteDelivery } from "@/services/deliveries";
import { setDeliveryPrice, clearDeliveryPrice } from "@/services/financials";
import { lineTotal } from "@/lib/ledger";
import { formatInr } from "@/lib/format";
import { createSupplier } from "@/services/suppliers";
import { createMaterial } from "@/services/materials";
import { useAuth } from "@/lib/auth";
import { SupplierPicker } from "@/components/pickers/SupplierPicker";
import { MaterialPicker } from "@/components/pickers/MaterialPicker";
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
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Props {
  trigger: ReactNode;
  delivery: Delivery;
  financial?: DeliveryFinancial;
  suppliers: Supplier[];
  materials: Material[];
}

export function DeliveryAdminDialog({ trigger, delivery, financial, suppliers, materials }: Props) {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser!.uid;
  const [open, setOpen] = useState(false);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [material, setMaterial] = useState<Material | null>(null);
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSupplier({ id: delivery.supplierId, name: delivery.supplierName });
    setMaterial({ id: delivery.materialId, name: delivery.materialName, unit: delivery.unit });
    setQuantity(String(delivery.quantity));
    setDate(delivery.date);
    setPrice(financial ? String(financial.price) : "");
  }, [open, delivery, financial]);

  const qtyNum = Number(quantity);
  const priceNum = Number(price);
  const valid = supplier && material && qtyNum > 0 && date;
  const previewTotal = priceNum > 0 && qtyNum > 0 ? lineTotal(qtyNum, priceNum) : null;

  async function save() {
    if (!valid) return;
    setBusy(true);
    try {
      await updateDelivery(delivery.id, {
        supplierId: supplier!.id,
        supplierName: supplier!.name,
        materialId: material!.id,
        materialName: material!.name,
        unit: material!.unit,
        quantity: qtyNum,
        date,
      });
      if (price === "" || priceNum <= 0) {
        if (financial) await clearDeliveryPrice(delivery.id);
      } else {
        await setDeliveryPrice(delivery.id, priceNum, qtyNum);
      }
      toast.success("Delivery updated");
      setOpen(false);
    } catch {
      toast.error("Could not update delivery");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit delivery</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Supplier</Label>
            <SupplierPicker
              suppliers={suppliers}
              value={supplier}
              onSelect={setSupplier}
              onCreate={async (name) => {
                const id = await createSupplier(name, uid);
                setSupplier({ id, name });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Material</Label>
            <MaterialPicker
              materials={materials}
              value={material}
              onSelect={setMaterial}
              onCreate={async (name, unit) => {
                const id = await createMaterial(name, unit, uid);
                setMaterial({ id, name, unit });
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="eqty">Quantity{material ? ` (${material.unit})` : ""}</Label>
              <Input id="eqty" type="number" inputMode="decimal" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edate">Date</Label>
              <Input id="edate" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
            </div>
          </div>
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <Label htmlFor="eprice">Price per {material?.unit ?? "unit"} (₹) — optional</Label>
            <Input id="eprice" type="number" inputMode="decimal" min="0" step="any" placeholder="Not priced yet" value={price} onChange={(e) => setPrice(e.target.value)} className="h-11" />
            {previewTotal !== null && (
              <p className="text-sm text-muted-foreground">
                Line total: <span className="font-semibold text-foreground">{formatInr(previewTotal)}</span>
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon" aria-label="Delete delivery">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            }
            title="Delete this delivery?"
            description="This removes the delivery and its price. This cannot be undone."
            confirmLabel="Delete"
            destructive
            onConfirm={async () => {
              await deleteDelivery(delivery.id);
              toast.success("Delivery deleted");
              setOpen(false);
            }}
          />
          <Button onClick={save} disabled={!valid || busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
