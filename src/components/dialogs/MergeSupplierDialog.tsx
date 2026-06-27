import { useState, type ReactNode } from "react";
import { Loader2, GitMerge } from "lucide-react";
import { toast } from "sonner";
import type { Supplier } from "@/lib/types";
import { mergeSuppliers } from "@/services/suppliers";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  trigger: ReactNode;
  /** The (possibly duplicate) supplier being merged away. */
  source: Supplier;
  /** All other suppliers that could be the correct target. */
  others: Supplier[];
  onMerged: (targetId: string) => void;
}

export function MergeSupplierDialog({ trigger, source, others, onMerged }: Props) {
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);

  const target = others.find((s) => s.id === targetId);

  async function merge() {
    if (!target) return;
    setBusy(true);
    try {
      await mergeSuppliers(source.id, target);
      toast.success(`Merged “${source.name}” into “${target.name}”`);
      setOpen(false);
      onMerged(target.id);
    } catch {
      toast.error("Could not merge suppliers");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge supplier</DialogTitle>
          <DialogDescription>
            Move all deliveries and payments from <strong>{source.name}</strong> to the correct
            supplier, then delete <strong>{source.name}</strong>. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Correct supplier to keep</Label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select the supplier to keep" />
            </SelectTrigger>
            <SelectContent>
              {others.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={merge} disabled={!target || busy}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GitMerge className="mr-2 h-4 w-4" />
            )}
            Merge &amp; delete “{source.name}”
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
