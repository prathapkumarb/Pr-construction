import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import type { Supplier } from "@/lib/types";
import { createSupplier, updateSupplier } from "@/services/suppliers";
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

interface Props {
  trigger: ReactNode;
  /** Existing supplier to edit. Omit to open in create mode. */
  supplier?: Supplier;
}

export function SupplierEditDialog({ trigger, supplier }: Props) {
  const { firebaseUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(supplier?.name ?? "");
    setPhone(supplier?.phone ?? "");
    setAddress(supplier?.address ?? "");
    setGstNumber(supplier?.gstNumber ?? "");
    setNotes(supplier?.notes ?? "");
    setAttempted(false);
  }, [open, supplier]);

  async function save() {
    setAttempted(true);
    if (!name.trim()) return;
    setBusy(true);
    try {
      if (supplier) {
        await updateSupplier(supplier.id, {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          gstNumber: gstNumber.trim(),
          notes: notes.trim(),
        });
        toast.success("Supplier updated");
      } else {
        await createSupplier(name.trim(), firebaseUser!.uid, {
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          gstNumber: gstNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        toast.success("Supplier added");
      }
      setOpen(false);
    } catch {
      toast.error(supplier ? "Could not update supplier" : "Could not add supplier");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? "Edit supplier" : "Add supplier"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="sname">Name</Label>
            <Input id="sname" value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
            {attempted && !name.trim() && (
              <p className="text-xs text-destructive">Name is required</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sphone">Phone</Label>
            <Input id="sphone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="saddr">Address</Label>
            <Input id="saddr" value={address} onChange={(e) => setAddress(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sgst">GST number</Label>
            <Input id="sgst" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="snotes">Notes</Label>
            <Input id="snotes" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-11" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {supplier ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
