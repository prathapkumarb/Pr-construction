import { useMemo } from "react";
import { Users, Plus } from "lucide-react";
import { useCollectionData } from "@/hooks/useCollectionData";
import type { LabourWorker } from "@/lib/labourTypes";
import { labourWorkersQuery } from "@/services/labour";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { WorkerDialog } from "@/components/dialogs/WorkerDialog";

export default function HumanResourcesPage() {
  const query = useMemo(() => labourWorkersQuery(), []);
  const { data: workers, loading } = useCollectionData<LabourWorker>(query);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Human Resources</h1>
        </div>
        <WorkerDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          }
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : workers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No workers added yet.</p>
            <WorkerDialog
              trigger={
                <Button size="sm" variant="outline">
                  Add the first worker
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {workers.map((w) => (
            <WorkerDialog
              key={w.id}
              worker={w}
              trigger={
                <Card className="cursor-pointer transition-colors hover:bg-accent">
                  <CardContent className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{w.name}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        {w.role && (
                          <span className="text-xs text-muted-foreground">{w.role}</span>
                        )}
                        {w.phone && (
                          <span className="text-xs text-muted-foreground">{w.phone}</span>
                        )}
                      </div>
                    </div>
                    {w.idType && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {w.idType}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
