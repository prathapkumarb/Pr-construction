import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Plus, ClipboardCheck, Search } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCollectionData } from "@/hooks/useCollectionData";
import type { LabourAttendance, LabourWorker } from "@/lib/labourTypes";
import { labourAttendanceQuery, labourWorkersQuery } from "@/services/labour";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AttendanceDialog } from "@/components/dialogs/AttendanceDialog";

function safeDate(value: string) {
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

export default function AttendancePage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const aQuery = useMemo(() => labourAttendanceQuery(), []);
  const wQuery = useMemo(() => labourWorkersQuery(), []);
  const { data: records, loading } = useCollectionData<LabourAttendance>(aQuery);
  const { data: workers } = useCollectionData<LabourWorker>(wQuery);

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => r.workerName.toLowerCase().includes(q));
  }, [records, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Attendance</h1>
        </div>
        <Button asChild size="sm">
          <Link to="/labour/attendance/new">
            <Plus className="mr-1 h-4 w-4" /> Mark
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by worker name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {search ? "No records match your search." : "No attendance records yet."}
            </p>
            {!search && (
              <Button asChild size="sm" variant="outline">
                <Link to="/labour/attendance/new">Mark the first one</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const card = (
              <Card
                className={
                  isAdmin ? "cursor-pointer transition-colors hover:bg-accent" : undefined
                }
              >
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.workerName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge
                        variant={r.attendance === "present" ? "default" : "destructive"}
                        className={
                          "text-xs " +
                          (r.attendance === "present"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "")
                        }
                      >
                        {r.attendance}
                      </Badge>
                      {r.ot > 0 && (
                        <span className="text-xs text-muted-foreground">OT: {r.ot}</span>
                      )}
                      {r.siteName && (
                        <span className="text-xs text-muted-foreground truncate">
                          · {r.siteName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-muted-foreground">{safeDate(r.date)}</p>
                  </div>
                </CardContent>
              </Card>
            );

            return isAdmin ? (
              <AttendanceDialog key={r.id} trigger={card} record={r} workers={workers} />
            ) : (
              <div key={r.id}>{card}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
