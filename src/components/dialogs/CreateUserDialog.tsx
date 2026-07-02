import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createUser } from "@/services/users";
import { useFullAccessConfig } from "@/lib/accessContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CUSTOM_ROLE_KEY = "__custom__";

interface Props {
  trigger?: React.ReactNode;
}

export function CreateUserDialog({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleSelect, setRoleSelect] = useState("supervisor");
  const [customRole, setCustomRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);

  // Load configured roles so admin-created roles appear in the dropdown
  const fullConfig = useFullAccessConfig();
  const configuredRoles = Object.keys(fullConfig).filter(
    (r) => r !== "admin" && r !== "supervisor",
  );

  const effectiveRole =
    roleSelect === CUSTOM_ROLE_KEY
      ? customRole.trim().toLowerCase().replace(/\s+/g, "_")
      : roleSelect;

  function reset() {
    setName("");
    setEmail("");
    setPassword("");
    setRoleSelect("supervisor");
    setCustomRole("");
    setAttempted(false);
  }

  async function submit() {
    setAttempted(true);
    if (!name.trim() || !email.trim() || password.length < 6) return;
    if (!effectiveRole) return; // custom role field empty
    setBusy(true);
    try {
      await createUser(name.trim(), email.trim(), password, effectiveRole);
      toast.success(`${name.trim()} added`);
      setOpen(false);
      reset();
    } catch (err: unknown) {
      console.error("createUser failed:", err);
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/email-already-in-use") {
        toast.error("Email already in use");
      } else if (code === "auth/weak-password") {
        toast.error("Password must be at least 6 characters");
      } else if (code === "permission-denied") {
        toast.error("Permission denied — Firestore rules need to be deployed");
      } else {
        const msg = (err as Error)?.message;
        toast.error(msg ? `Error: ${msg}` : "Could not create user");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <UserPlus className="mr-1 h-4 w-4" /> Add user
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="cu-name">Full name</Label>
            <Input
              id="cu-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              autoComplete="off"
            />
            {attempted && !name.trim() && (
              <p className="text-xs text-destructive">Full name is required</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email</Label>
            <Input
              id="cu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              autoComplete="off"
            />
            {attempted && !email.trim() && (
              <p className="text-xs text-destructive">Email is required</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-password">Password</Label>
            <Input
              id="cu-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              autoComplete="new-password"
            />
            {attempted && password.length < 6 && (
              <p className="text-xs text-destructive">Password must be at least 6 characters</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={roleSelect} onValueChange={setRoleSelect}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                {configuredRoles.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r.replace(/_/g, " ")}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_ROLE_KEY}>Other role…</SelectItem>
              </SelectContent>
            </Select>
            {roleSelect === CUSTOM_ROLE_KEY && (
              <div className="mt-1.5 space-y-1">
                <Input
                  placeholder="e.g. hr, site_manager"
                  value={customRole}
                  onChange={(e) =>
                    setCustomRole(e.target.value.toLowerCase().replace(/\s+/g, "_"))
                  }
                  autoFocus
                />
                {attempted && !effectiveRole && (
                  <p className="text-xs text-destructive">Role name is required</p>
                )}
              </div>
            )}
          </div>
          <Button className="w-full" disabled={busy} onClick={submit}>
            {busy ? "Creating…" : "Create user"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
