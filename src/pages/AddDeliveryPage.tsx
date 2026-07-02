import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Loader2, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useCollectionData } from "@/hooks/useCollectionData";
import type { Material, Site, Supplier } from "@/lib/types";
import { suppliersQuery, createSupplier, setSupplierActive } from "@/services/suppliers";
import { materialsQuery, createMaterial } from "@/services/materials";
import { createDelivery } from "@/services/deliveries";
import { sitesQuery, createSite, setSiteActive } from "@/services/sites";
import { setDeliveryPrice, setDeliveryTotal } from "@/services/financials";
import { lineTotal } from "@/lib/ledger";
import { formatInr } from "@/lib/format";
import { useAccess } from "@/lib/accessContext";
import { SupplierPicker } from "@/components/pickers/SupplierPicker";
import { MaterialPicker } from "@/components/pickers/MaterialPicker";
import { SiteNamePicker } from "@/components/pickers/SiteNamePicker";
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
  const siteQ = useMemo(() => sitesQuery(), []);
  const { data: suppliers } = useCollectionData<Supplier>(sQuery);
  const { data: materials } = useCollectionData<Material>(mQuery);
  const { data: sites } = useCollectionData<Site>(siteQ);

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [material, setMaterial] = useState<Material | null>(null);
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [siteName, setSiteName] = useState("");
  const [price, setPrice] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const access = useAccess();

  const qtyNum = Number(quantity);
  const isNumericQty = quantity.trim() !== "" && !isNaN(qtyNum) && qtyNum > 0;
  const priceNum = Number(price);
  const totalAmountNum = Number(totalAmount);
  const valid = supplier && material && quantity.trim() !== "" && date;
  const previewTotal = isNumericQty && priceNum > 0 ? lineTotal(qtyNum, priceNum) : null;

  async function handleCreateSupplier(name: string) {
    const id = await createSupplier(name, uid);
    setSupplier({ id, name, active: true });
    toast.success(`Supplier “${name}” added`);
  }

  async function handleReactivateSupplier(s: Supplier) {
    await setSupplierActive(s.id, true);
    setSupplier(s);
    toast.success(`${s.name} reactivated`);
  }

  async function handleCreateSite(name: string) {
    await createSite(name, uid);
    setSiteName(name);
    toast.success(`Site “${name}” added`);
  }

  async function handleReactivateSite(site: Site) {
    await setSiteActive(site.id, true);
    setSiteName(site.name);
    toast.success(`Site “${site.name}” reactivated`);
  }

  async function handleCreateMaterial(name: string, unit: string) {
    const id = await createMaterial(name, unit, uid);
    setMaterial({ id, name, unit });
    toast.success(`Material “${name}” (${unit}) added`);
  }

  async function handleSubmit() {
    setAttempted(true);
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
          quantity: isNumericQty ? qtyNum : quantity.trim(),
          date,
          siteName: siteName.trim() || undefined,
        },
        uid,
      );
      if (isNumericQty && priceNum > 0) {
        await setDeliveryPrice(deliveryId, priceNum, qtyNum);
      } else if (!isNumericQty && totalAmountNum > 0) {
        await setDeliveryTotal(deliveryId, totalAmountNum);
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
              onReactivate={handleReactivateSupplier}
            />
            {attempted && !supplier && (
              <p className="text-xs text-destructive">Supplier is required</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Material</Label>
            <MaterialPicker
              materials={materials}
              value={material}
              onSelect={setMaterial}
              onCreate={handleCreateMaterial}
            />
            {attempted && !material && (
              <p className="text-xs text-destructive">Material is required</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity{material ? ` (${material.unit})` : ""}</Label>
              <Input
                id="qty"
                type="text"
                inputMode="decimal"
                placeholder="e.g. 50 or 2 truck loads"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-11"
              />
              {attempted && quantity.trim() === "" && (
                <p className="text-xs text-destructive">Quantity is required</p>
              )}
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
              {attempted && !date && (
                <p className="text-xs text-destructive">Date is required</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Site name — optional</Label>
            <SiteNamePicker
              sites={sites}
              value={siteName}
              onChange={setSiteName}
              onCreate={handleCreateSite}
              onReactivate={handleReactivateSite}
            />
          </div>

          {access.fields.deliveryPricing && (
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            {isNumericQty ? (
              <>
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
                    Total:{" "}
                    <span className="font-semibold text-foreground">{formatInr(previewTotal)}</span>
                  </p>
                )}
              </>
            ) : (
              <>
                <Label htmlFor="totalAmount">
                  Total amount (₹) — optional
                </Label>
                <Input
                  id="totalAmount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder="Leave blank to price later"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="h-11"
                />
              </>
            )}
          </div>
          )}
        </CardContent>
      </Card>

      <Button className="h-12 w-full text-base" disabled={saving} onClick={handleSubmit}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save delivery
      </Button>
    </div>
  );
}
