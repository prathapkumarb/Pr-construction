import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Loader2, ClipboardCheck, Search, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useCollectionData } from "@/hooks/useCollectionData";
import type { LabourWorker } from "@/lib/labourTypes";
import {
  labourWorkersQuery,
  createLabourWorker,
  createLabourAttendance,
} from "@/services/labour";
import { sitesQuery, createSite, setSiteActive } from "@/services/sites";
import type { Site } from "@/lib/types";
import { normalizeName, hasExactMatch } from "@/lib/fuzzy";
import { SiteNamePicker } from "@/components/pickers/SiteNamePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const OT_OPTIONS: Array<0 | 0.5 | 1> = [0, 0.5, 1];

export default function AddAttendancePage() {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const uid = firebaseUser!.uid;

  const wQuery = useMemo(() => labourWorkersQuery(), []);
  const siteQ = useMemo(() => sitesQuery(), []);
  const { data: workers } = useCollectionData<LabourWorker>(wQuery);
  const { data: sites } = useCollectionData<Site>(siteQ);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [attendance, setAttendance] = useState<"present" | "absent">("present");
  const [ot, setOt] = useState<0 | 0.5 | 1>(0);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [siteName, setSiteName] = useState("");
  const [workerSearch, setWorkerSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [creatingWorker, setCreatingWorker] = useState(false);

  const trimmedSearch = workerSearch.trim();
  const normSearch = normalizeName(trimmedSearch);

  const filteredWorkers = useMemo(() => {
    if (!normSearch) return workers;
    return workers.filter((w) => normalizeName(w.name).includes(normSearch));
  }, [workers, normSearch]);

  const canCreateWorker =
    trimmedSearch.length >= 2 && !hasExactMatch(trimmedSearch, workers);

  const allFilteredSelected =
    filteredWorkers.length > 0 && filteredWorkers.every((w) => selectedIds.has(w.id));

  function toggleWorker(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredWorkers.forEach((w) => next.delete(w.id));
      } else {
        filteredWorkers.forEach((w) => next.add(w.id));
      }
      return next;
    });
  }

  async function handleCreateWorker() {
    setCreatingWorker(true);
    try {
      const id = await createLabourWorker({ name: trimmedSearch }, uid);
      setSelectedIds((prev) => new Set([...prev, id]));
      setWorkerSearch("");
      toast.success(`Worker "${trimmedSearch}" added`);
    } catch {
      toast.error("Could not add worker");
    } finally {
      setCreatingWorker(false);
    }
  }

  async function handleCreateSite(name: string) {
    await createSite(name, uid);
    setSiteName(name);
    toast.success(`Site "${name}" added`);
  }

  async function handleReactivateSite(site: Site) {
    await setSiteActive(site.id, true);
    setSiteName(site.name);
    toast.success(`Site "${site.name}" reactivated`);
  }

  async function handleSubmit() {
    setAttempted(true);
    if (selectedIds.size === 0 || !date) return;
    setSaving(true);
    try {
      const workerList = workers.filter((w) => selectedIds.has(w.id));
      const results = await Promise.allSettled(
        workerList.map((w) =>
          createLabourAttendance(
            {
              workerId: w.id,
              workerName: w.name,
              attendance,
              ot,
              date,
              siteName: siteName.trim() || undefined,
            },
            uid,
          ),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) {
        toast.success(
          `Attendance saved for ${workerList.length} worker${workerList.length > 1 ? "s" : ""}`,
        );
        navigate("/labour/attendance");
      } else {
        toast.error(`${failed} of ${workerList.length} records failed. Try again.`);
      }
    } catch (err) {
      console.error("saveAttendance failed:", err);
      toast.error("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Mark attendance</h1>
      </div>

      {/* Details card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Attendance toggle */}
          <div className="space-y-2">
            <Label>Attendance</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["present", "absent"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAttendance(v)}
                  className={
                    "rounded-md border px-4 py-3 text-sm font-medium capitalize transition-colors " +
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
          <div className="space-y-2">
            <Label>Overtime (OT days)</Label>
            <div className="flex gap-2">
              {OT_OPTIONS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setOt(v)}
                  className={
                    "flex-1 rounded-md border px-3 py-3 text-sm font-medium transition-colors " +
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
          <div className="space-y-2">
            <Label htmlFor="att-date">Date</Label>
            <Input
              id="att-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11"
            />
            {attempted && !date && (
              <p className="text-xs text-destructive">Date is required</p>
            )}
          </div>

          {/* Site */}
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
        </CardContent>
      </Card>

      {/* Workers card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Workers
              {selectedIds.size > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {selectedIds.size} selected
                </span>
              )}
            </CardTitle>
            {filteredWorkers.length > 0 && (
              <button
                type="button"
                onClick={toggleAllFiltered}
                className="text-xs text-primary underline-offset-2 hover:underline"
              >
                {allFilteredSelected ? "Deselect all" : "Select all"}
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workers…"
              value={workerSearch}
              onChange={(e) => setWorkerSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          {/* Worker list */}
          <div className="max-h-64 overflow-y-auto space-y-1 rounded-md">
            {filteredWorkers.length === 0 && !canCreateWorker && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {trimmedSearch ? "No workers match your search." : "No workers yet."}
              </p>
            )}
            {filteredWorkers.map((w) => {
              const checked = selectedIds.has(w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => toggleWorker(w.id)}
                  className={
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors " +
                    (checked ? "bg-primary/10" : "hover:bg-accent")
                  }
                >
                  <span
                    className={
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors " +
                      (checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40")
                    }
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{w.name}</span>
                    {w.role && (
                      <span className="block truncate text-xs text-muted-foreground">{w.role}</span>
                    )}
                  </span>
                </button>
              );
            })}

            {/* Add new worker inline */}
            {canCreateWorker && (
              <button
                type="button"
                onClick={handleCreateWorker}
                disabled={creatingWorker}
                className="flex w-full items-center gap-3 rounded-md border border-dashed px-3 py-2.5 text-left transition-colors hover:bg-accent disabled:opacity-50"
              >
                {creatingWorker ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                ) : (
                  <Plus className="h-4 w-4 shrink-0 text-primary" />
                )}
                <span className="text-sm text-primary">
                  Add "{trimmedSearch}" as new worker
                </span>
              </button>
            )}
          </div>

          {attempted && selectedIds.size === 0 && (
            <p className="text-xs text-destructive">Select at least one worker</p>
          )}
        </CardContent>
      </Card>

      <Button
        className="h-12 w-full text-base"
        disabled={saving || selectedIds.size === 0}
        onClick={handleSubmit}
      >
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {selectedIds.size > 1
          ? `Save attendance (${selectedIds.size} workers)`
          : "Save attendance"}
      </Button>
    </div>
  );
}
