import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import type { Material } from "@/lib/types";
import { createMaterial, updateMaterial } from "@/services/materials";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const COMMON_UNITS = ["kg", "Nos", "bags", "litre", "ton", "box", "ft", "m"];

interface Props {
  trigger: ReactNode;
  /** Existing material to edit; omit to create. */
  material?: Material;
  /** Number of deliveries using this material (shown when editing the unit). */
  usageCount?: number;
}

export function MaterialDialog({ trigger, material, usageCount = 0 }: Props) {
  const { firebaseUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(material?.name ?? "");
    setUnit(material?.unit ?? "");
    setAttempted(false);
  }, [open, material]);

  const valid = name.trim() && unit.trim();

  async function save() {
    setAttempted(true);
    if (!valid) return;
    setBusy(true);
    try {
      if (material) {
        await updateMaterial(material.id, { name, unit });
        toast.success("Material updated");
      } else {
        await createMaterial(name, unit, firebaseUser!.uid);
        toast.success("Material added");
      }
      setOpen(false);
    } catch {
      toast.error("Could not save material");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{material ? "Edit material" : "Add material"}</DialogTitle>
          {material && usageCount > 0 && (
            <DialogDescription>
              Used by {usageCount} deliver{usageCount === 1 ? "y" : "ies"} — changes update them
              too.
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="mname">Name</Label>
            <Input id="mname" value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
            {attempted && !name.trim() && (
              <p className="text-xs text-destructive">Name is required</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="munit">Unit</Label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium",
                    unit === u ? "border-primary bg-primary text-primary-foreground" : "bg-background",
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
            <Input id="munit" value={unit} onChange={(e) => setUnit(e.target.value)} className="h-11" />
            {attempted && !unit.trim() && (
              <p className="text-xs text-destructive">Unit is required</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {material ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
