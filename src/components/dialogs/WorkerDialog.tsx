import { useEffect, useState, type ReactNode } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import type { LabourWorker } from "@/lib/labourTypes";
import {
  createLabourWorker,
  updateLabourWorker,
  deleteLabourWorker,
  createLabourRate,
} from "@/services/labour";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ID_TYPES = ["Aadhar", "PAN", "Passport", "Voter ID", "Driving Licence", "Other"];

interface Props {
  trigger: ReactNode;
  worker?: LabourWorker; // omit to create
}

export function WorkerDialog({ trigger, worker }: Props) {
  const { firebaseUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState("");
  const [ratePerDay, setRatePerDay] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(worker?.name ?? "");
    setPhone(worker?.phone ?? "");
    setIdType(worker?.idType ?? "");
    setIdNumber(worker?.idNumber ?? "");
    setAddress(worker?.address ?? "");
    setRole(worker?.role ?? "");
    setRatePerDay(worker?.ratePerDay != null ? String(worker.ratePerDay) : "");
    setAttempted(false);
  }, [open, worker]);

  const rateNum = ratePerDay !== "" ? Number(ratePerDay) : undefined;
  const today = new Date().toISOString().split("T")[0];

  async function save() {
    setAttempted(true);
    if (!name.trim()) return;
    setBusy(true);
    try {
      const uid = firebaseUser!.uid;
      const input = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        idType: idType || undefined,
        idNumber: idNumber.trim() || undefined,
        address: address.trim() || undefined,
        role: role.trim() || undefined,
        ratePerDay: rateNum,
      };
      if (worker) {
        await updateLabourWorker(worker.id, input);
        // If rate changed, record the change in history
        if (rateNum != null && rateNum > 0 && rateNum !== worker.ratePerDay) {
          await createLabourRate(
            {
              workerId: worker.id,
              workerName: name.trim(),
              ratePerDay: rateNum,
              effectiveFrom: today,
            },
            uid,
          );
        }
        toast.success("Worker updated");
      } else {
        const newId = await createLabourWorker(input, uid);
        // Create initial rate history entry
        if (rateNum != null && rateNum > 0) {
          await createLabourRate(
            {
              workerId: newId,
              workerName: name.trim(),
              ratePerDay: rateNum,
              effectiveFrom: today,
            },
            uid,
          );
        }
        toast.success(`${name.trim()} added`);
      }
      setOpen(false);
    } catch {
      toast.error("Could not save worker");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!worker) return;
    setBusy(true);
    try {
      await deleteLabourWorker(worker.id);
      toast.success("Worker removed");
      setOpen(false);
    } catch {
      toast.error("Could not remove worker");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{worker ? "Edit worker" : "Add worker"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="w-name">Name</Label>
            <Input
              id="w-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="h-11"
              autoFocus={!worker}
            />
            {attempted && !name.trim() && (
              <p className="text-xs text-destructive">Name is required</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="w-phone">Phone</Label>
              <Input
                id="w-phone"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-rate">Rate / day (₹)</Label>
              <Input
                id="w-rate"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={ratePerDay}
                onChange={(e) => setRatePerDay(e.target.value)}
                placeholder="e.g. 500"
                className="h-11"
              />
              {worker && rateNum != null && rateNum > 0 && rateNum !== worker.ratePerDay && (
                <p className="text-xs text-amber-600">
                  Rate change will be saved with today's date as effective from.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="w-role">Role / Trade</Label>
            <Input
              id="w-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Mason, Carpenter, Painter"
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type of ID</Label>
              <Select value={idType} onValueChange={setIdType}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {ID_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-idno">ID number</Label>
              <Input
                id="w-idno"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="Optional"
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="w-addr">Address</Label>
            <Input
              id="w-addr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Optional"
              className="h-11"
            />
          </div>
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          {worker ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={remove}
              disabled={busy}
              aria-label="Delete worker"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {worker ? "Save" : "Add worker"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
