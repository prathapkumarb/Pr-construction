import { useEffect, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import type { LabourAttendance, LabourWorker } from "@/lib/labourTypes";
import { updateLabourAttendance, deleteLabourAttendance } from "@/services/labour";
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

const OT_OPTIONS: Array<0 | 0.5 | 1> = [0, 0.5, 1];

interface Props {
  trigger: ReactNode;
  record: LabourAttendance;
  workers: LabourWorker[];
}

export function AttendanceDialog({ trigger, record }: Props) {
  const { firebaseUser: _ } = useAuth();
  const [open, setOpen] = useState(false);
  const [attendance, setAttendance] = useState<"present" | "absent">("present");
  const [ot, setOt] = useState<0 | 0.5 | 1>(0);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [siteName, setSiteName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAttendance(record.attendance);
    setOt(record.ot);
    setDate(record.date);
    setSiteName(record.siteName ?? "");
  }, [open, record]);

  async function save() {
    setBusy(true);
    try {
      await updateLabourAttendance(record.id, {
        workerId: record.workerId,
        workerName: record.workerName,
        attendance,
        ot,
        date,
        siteName: siteName.trim() || undefined,
      });
      toast.success("Attendance updated");
      setOpen(false);
    } catch {
      toast.error("Could not update attendance");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteLabourAttendance(record.id);
      toast.success("Record deleted");
      setOpen(false);
    } catch {
      toast.error("Could not delete record");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit attendance — {record.workerName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Attendance toggle */}
          <div className="space-y-1.5">
            <Label>Attendance</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["present", "absent"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAttendance(v)}
                  className={
                    "rounded-md border px-4 py-2.5 text-sm font-medium capitalize transition-colors " +
                    (attendance === v
                      ? v === "present"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                        : "border-destructive bg-destructive/10 text-destructive"
                      : "bg-background hover:bg-accent")
                  }
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* OT */}
          <div className="space-y-1.5">
            <Label>Overtime (OT days)</Label>
            <div className="flex gap-2">
              {OT_OPTIONS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setOt(v)}
                  className={
                    "flex-1 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors " +
                    (ot === v
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-accent")
                  }
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="ad-date">Date</Label>
            <Input
              id="ad-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Site */}
          <div className="space-y-1.5">
            <Label htmlFor="ad-site">Site name — optional</Label>
            <Input
              id="ad-site"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Site name"
              className="h-11"
            />
          </div>
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={remove}
            disabled={busy}
            aria-label="Delete record"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
