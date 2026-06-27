import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Loader2, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useCollectionData } from "@/hooks/useCollectionData";
import type { Material, Supplier } from "@/lib/types";
import { suppliersQuery, createSupplier } from "@/services/suppliers";
import { materialsQuery, createMaterial } from "@/services/materials";
import { createDelivery } from "@/services/deliveries";
import { setDeliveryPrice } from "@/services/financials";
import { lineTotal } from "@/lib/ledger";
import { formatInr } from "@/lib/format";
import { SupplierPicker } from "@/components/pickers/SupplierPicker";
import { MaterialPicker } from "@/components/pickers/MaterialPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AddDeliveryPage() {
  const { firebaseUser, role } = useAuth();
  const navigate = useNavigate();
  const uid = firebaseUser!.uid;
  const isAdmin = role === "admin";

  const sQuery = useMemo(() => suppliersQuery(), []);
  const mQuery = useMemo(() => materialsQuery(), []);
  const { data: suppliers } = useCollectionData<Supplier>(sQuery);
  const { data: materials } = useCollectionData<Material>(mQuery);

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [material, setMaterial] = useState<Material | null>(null);
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const qtyNum = Number(quantity);
  const priceNum = Number(price);
  const valid = supplier && material && quantity !== "" && qtyNum > 0 && date;
  const previewTotal = isAdmin && priceNum > 0 && qtyNum > 0 ? lineTotal(qtyNum, priceNum) : null;

  async function handleCreateSupplier(name: string) {
    const id = await createSupplier(name, uid);
    setSupplier({ id, name });
    toast.success(`Supplier “${name}” added`);
  }

  async function handleCreateMaterial(name: string, unit: string) {
    const id = await createMaterial(name, unit, uid);
    setMaterial({ id, name, unit });
    toast.success(`Material “${name}” (${unit}) added`);
  }

  async function handleSubmit() {
    if (!valid) return;
    setSaving(true);
    try {
      const deliveryId = await createDelivery(
        {
          supplierId: supplier!.id,
          supplierName: supplier!.name,
          materialId: material!.id,
          materialName: material!.name,
          unit: material!.unit,
          quantity: qtyNum,
          date,
        },
        uid,
      );
      if (isAdmin && priceNum > 0) {
        await setDeliveryPrice(deliveryId, priceNum, qtyNum);
      }
      toast.success("Delivery recorded");
      navigate("/deliveries");
    } catch {
      toast.error("Could not save delivery. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <PackagePlus className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Record delivery</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Supplier</Label>
            <SupplierPicker
              suppliers={suppliers}
              value={supplier}
              onSelect={setSupplier}
              onCreate={handleCreateSupplier}
            />
          </div>

          <div className="space-y-2">
            <Label>Material</Label>
            <MaterialPicker
              materials={materials}
              value={material}
              onSelect={setMaterial}
              onCreate={handleCreateMaterial}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity{material ? ` (${material.unit})` : ""}</Label>
              <Input
                id="qty"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          {isAdmin && (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <Label htmlFor="price">
                Price per {material?.unit ?? "unit"} (₹) — optional
              </Label>
              <Input
                id="price"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="Leave blank to price later"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-11"
              />
              {previewTotal !== null && (
                <p className="text-sm text-muted-foreground">
                  Line total:{" "}
                  <span className="font-semibold text-foreground">{formatInr(previewTotal)}</span>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Button className="h-12 w-full text-base" disabled={!valid || saving} onClick={handleSubmit}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save delivery
      </Button>
    </div>
  );
}
