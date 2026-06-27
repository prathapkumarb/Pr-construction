import { useMemo, useState } from "react";
import { Boxes, Plus, Pencil, Trash2, MapPin, Power, PowerOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useCollectionData } from "@/hooks/useCollectionData";
import { useLedger } from "@/hooks/useLedger";
import type { Material, Site } from "@/lib/types";
import { materialsQuery, deleteMaterial } from "@/services/materials";
import { sitesQuery, createSite, setSiteActive } from "@/services/sites";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MaterialDialog } from "@/components/dialogs/MaterialDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";

function AddSiteRow({ uid }: { uid: string }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    const t = name.trim();
    if (!t) return;
    setBusy(true);
    try {
      await createSite(t, uid);
      toast.success(`Site "${t}" added`);
      setName("");
    } catch {
      toast.error("Could not add site");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        placeholder="New site name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
        className="h-11"
      />
      <Button className="h-11 shrink-0" disabled={!name.trim() || busy} onClick={add}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
      </Button>
    </div>
  );
}

export default function MaterialsPage() {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser!.uid;

  const mQuery = useMemo(() => materialsQuery(), []);
  const siteQ = useMemo(() => sitesQuery(), []);
  const { data: materials, loading: mLoading } = useCollectionData<Material>(mQuery);
  const { data: sites, loading: sLoading } = useCollectionData<Site>(siteQ);
  const { deliveries } = useLedger();

  const usageByMaterial = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of deliveries) m.set(d.materialId, (m.get(d.materialId) ?? 0) + 1);
    return m;
  }, [deliveries]);

  const activeSites = useMemo(() => sites.filter((s) => s.active !== false), [sites]);
  const inactiveSites = useMemo(() => sites.filter((s) => s.active === false), [sites]);

  return (
    <div className="space-y-8">
      {/* ── Materials ── */}
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

        {mLoading ? (
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

      {/* ── Site locations ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Site locations</h2>
        </div>

        <AddSiteRow uid={uid} />

        {sLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : activeSites.length === 0 && inactiveSites.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
              <MapPin className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No site locations added yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {activeSites.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <p className="truncate font-medium">{s.name}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Deactivate site"
                    onClick={async () => {
                      await setSiteActive(s.id, false);
                      toast.success(`"${s.name}" deactivated`);
                    }}
                  >
                    <PowerOff className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {inactiveSites.map((s) => (
              <Card key={s.id} className="opacity-60">
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="truncate font-medium">{s.name}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">inactive</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Reactivate site"
                    onClick={async () => {
                      await setSiteActive(s.id, true);
                      toast.success(`"${s.name}" reactivated`);
                    }}
                  >
                    <Power className="h-4 w-4 text-emerald-600" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
