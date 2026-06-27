import { useMemo } from "react";
import { Boxes, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCollectionData } from "@/hooks/useCollectionData";
import { useLedger } from "@/hooks/useLedger";
import type { Material } from "@/lib/types";
import { materialsQuery, deleteMaterial } from "@/services/materials";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MaterialDialog } from "@/components/dialogs/MaterialDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function MaterialsPage() {
  const mQuery = useMemo(() => materialsQuery(), []);
  const { data: materials, loading } = useCollectionData<Material>(mQuery);
  const { deliveries } = useLedger();

  const usageByMaterial = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of deliveries) m.set(d.materialId, (m.get(d.materialId) ?? 0) + 1);
    return m;
  }, [deliveries]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Boxes className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Materials</h1>
        </div>
        <MaterialDialog
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
      ) : materials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Boxes className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No materials yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {materials.map((m) => {
            const usage = usageByMaterial.get(m.id) ?? 0;
            return (
              <Card key={m.id}>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Unit: {m.unit}
                      {usage > 0 && <span className="ml-1">· {usage} deliveries</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <MaterialDialog
                      material={m}
                      usageCount={usage}
                      trigger={
                        <Button variant="ghost" size="icon" aria-label="Edit material">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    {usage > 0 ? (
                      <Badge variant="outline" className="text-[10px]">
                        in use
                      </Badge>
                    ) : (
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Delete material">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        }
                        title={`Delete ${m.name}?`}
                        description="This material isn't used by any delivery and will be removed."
                        confirmLabel="Delete"
                        destructive
                        onConfirm={async () => {
                          await deleteMaterial(m.id);
                          toast.success("Material deleted");
                        }}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
