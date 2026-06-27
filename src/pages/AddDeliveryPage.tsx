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
import { SupplierPicker } from "@/components/pickers/SupplierPicker";
import { MaterialPicker } from "@/components/pickers/MaterialPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AddDeliveryPage() {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const uid = firebaseUser!.uid;

  const sQuery = useMemo(() => suppliersQuery(), []);
  const mQuery = useMemo(() => materialsQuery(), []);
  const { data: suppliers } = useCollectionData<Supplier>(sQuery);
  const { data: materials } = useCollectionData<Material>(mQuery);

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [material, setMaterial] = useState<Material | null>(null);
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);

  const qtyNum = Number(quantity);
  const valid = supplier && material && quantity !== "" && qtyNum > 0 && date;

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
      await createDelivery(
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
        </CardContent>
      </Card>

      <Button className="h-12 w-full text-base" disabled={!valid || saving} onClick={handleSubmit}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save delivery
      </Button>
    </div>
  );
}
