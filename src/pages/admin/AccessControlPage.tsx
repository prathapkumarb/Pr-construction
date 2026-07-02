import { useState } from "react";
import { ShieldCheck, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_ROLE_ACCESS, type AccessConfig, type RoleAccess } from "@/lib/access";
import { saveAccessConfig } from "@/services/access";
import { useFullAccessConfig } from "@/lib/accessContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Toggle group definitions ─────────────────────────────────────────────────

const NAV_TOGGLES: { key: keyof RoleAccess["tabs"]; label: string }[] = [
  { key: "suppliers", label: "Suppliers tab" },
  { key: "labour", label: "Labour tab" },
  { key: "more", label: "More tab" },
];

const SUB_TOGGLES: { key: keyof RoleAccess["tabs"]; label: string }[] = [
  { key: "subDeliveries", label: "Deliveries" },
  { key: "subMaterials", label: "Materials" },
  { key: "subPayments", label: "Payments" },
];

const FIELD_TOGGLES: { key: keyof RoleAccess["fields"]; label: string }[] = [
  { key: "deliveryPricing", label: "Delivery pricing — price per unit & totals" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function summarise(access: RoleAccess): string {
  const navVisible = NAV_TOGGLES.filter((t) => access.tabs[t.key]).map((t) => t.label);
  const subVisible = SUB_TOGGLES.filter((t) => access.tabs[t.key]).map((t) => t.label);
  const allVisible = [...navVisible, ...subVisible];
  const tabsPart = allVisible.length ? allVisible.join(", ") : "No tabs";
  return `${tabsPart} · Pricing: ${access.fields.deliveryPricing ? "On" : "Off"}`;
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="h-4 w-4 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

// ─── Edit Role Dialog ─────────────────────────────────────────────────────────

interface EditDialogProps {
  roleName: string;
  access: RoleAccess;
  isNew?: boolean;
  existingNames: string[];
  /** Saves to Firestore — resolves on success, throws on failure. */
  onSave: (name: string, access: RoleAccess) => Promise<void>;
  onClose: () => void;
}

function EditRoleDialog({
  roleName,
  access,
  isNew,
  existingNames,
  onSave,
  onClose,
}: EditDialogProps) {
  const [name, setName] = useState(roleName);
  const [tabs, setTabs] = useState({ ...access.tabs });
  const [fields, setFields] = useState({ ...access.fields });
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  const normalised = name.trim().toLowerCase().replace(/\s+/g, "_");
  const nameConflict = isNew && existingNames.includes(normalised);

  async function handleSave() {
    setAttempted(true);
    if (!normalised || nameConflict) return;
    setSaving(true);
    try {
      await onSave(normalised, { tabs, fields });
      onClose();
    } catch {
      // error toast already shown by parent
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "New Role" : `Edit Role: ${roleName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Role name — editable only when creating */}
          <div className="space-y-1.5">
            <SectionLabel>Role name</SectionLabel>
            {isNew ? (
              <>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder="e.g. hr, site_manager"
                  className="h-9"
                  autoFocus
                  disabled={saving}
                />
                {attempted && !normalised && (
                  <p className="text-xs text-destructive">Role name is required</p>
                )}
                {nameConflict && (
                  <p className="text-xs text-destructive">
                    Role "{normalised}" already exists
                  </p>
                )}
              </>
            ) : (
              <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm capitalize">
                {roleName.replace(/_/g, " ")}
              </p>
            )}
          </div>

          {/* Navigation tabs */}
          <div className="space-y-2.5">
            <SectionLabel>Navigation tabs</SectionLabel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {NAV_TOGGLES.map(({ key, label }) => (
                <Checkbox
                  key={key}
                  label={label}
                  checked={tabs[key]}
                  onChange={(v) => setTabs((p) => ({ ...p, [key]: v }))}
                />
              ))}
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="space-y-2.5">
            <SectionLabel>Sub-tabs — inside Suppliers</SectionLabel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {SUB_TOGGLES.map(({ key, label }) => (
                <Checkbox
                  key={key}
                  label={label}
                  checked={tabs[key]}
                  onChange={(v) => setTabs((p) => ({ ...p, [key]: v }))}
                />
              ))}
            </div>
          </div>

          {/* Data access */}
          <div className="space-y-2.5">
            <SectionLabel>Data access</SectionLabel>
            <div className="space-y-2">
              {FIELD_TOGGLES.map(({ key, label }) => (
                <Checkbox
                  key={key}
                  label={label}
                  checked={fields[key]}
                  onChange={(v) => setFields((p) => ({ ...p, [key]: v }))}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {isNew ? "Create role" : "Save role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccessControlPage() {
  const liveConfig = useFullAccessConfig();
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [deletingRole, setDeletingRole] = useState<string | null>(null);

  async function saveEdit(originalName: string, newAccess: RoleAccess): Promise<void> {
    const newConfig: AccessConfig = { ...liveConfig, [originalName]: newAccess };
    try {
      await saveAccessConfig(newConfig);
      toast.success("Role saved");
    } catch {
      toast.error("Could not save role");
      throw new Error("save failed");
    }
  }

  async function saveNew(name: string, access: RoleAccess): Promise<void> {
    const newConfig: AccessConfig = { ...liveConfig, [name]: access };
    try {
      await saveAccessConfig(newConfig);
      toast.success(`Role "${name}" created`);
    } catch {
      toast.error("Could not create role");
      throw new Error("save failed");
    }
  }

  async function deleteRole(role: string) {
    setDeletingRole(role);
    const newConfig: AccessConfig = { ...liveConfig };
    delete newConfig[role];
    try {
      await saveAccessConfig(newConfig);
      toast.success(`Role "${role}" removed`);
    } catch {
      toast.error("Could not remove role");
    } finally {
      setDeletingRole(null);
    }
  }

  const roleEntries = Object.entries(liveConfig).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Roles & Permissions</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Define roles to specify which tabs and features each user type can access.
        Admin always has full access.
      </p>

      {/* Roles list */}
      <div className="rounded-lg border divide-y overflow-hidden">
        {roleEntries.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No roles yet. Add one below.
          </p>
        )}
        {roleEntries.map(([role, access]) => (
          <div key={role} className="flex items-center gap-2 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium capitalize">
                {role.replace(/_/g, " ")}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {summarise(access)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 gap-1 px-2 text-xs"
              onClick={() => setEditingRole(role)}
              disabled={deletingRole === role}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label={`Remove ${role}`}
              onClick={() => deleteRole(role)}
              disabled={deletingRole === role}
            >
              {deletingRole === role ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              )}
            </Button>
          </div>
        ))}
      </div>

      {/* Add role */}
      <Button variant="outline" className="w-full" onClick={() => setAddingNew(true)}>
        <Plus className="mr-1 h-4 w-4" /> New role
      </Button>

      {/* Edit dialog */}
      {editingRole !== null && liveConfig[editingRole] && (
        <EditRoleDialog
          roleName={editingRole}
          access={liveConfig[editingRole]}
          existingNames={Object.keys(liveConfig)}
          onSave={(_, access) => saveEdit(editingRole, access)}
          onClose={() => setEditingRole(null)}
        />
      )}

      {/* New role dialog */}
      {addingNew && (
        <EditRoleDialog
          roleName=""
          access={{ ...DEFAULT_ROLE_ACCESS }}
          isNew
          existingNames={Object.keys(liveConfig)}
          onSave={saveNew}
          onClose={() => setAddingNew(false)}
        />
      )}
    </div>
  );
}
