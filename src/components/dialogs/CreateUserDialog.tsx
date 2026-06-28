import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createUser } from "@/services/users";
import type { Role } from "@/lib/types";
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

interface Props {
  trigger?: React.ReactNode;
}

export function CreateUserDialog({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("supervisor");
  const [busy, setBusy] = useState(false);

  function reset() {
    setName("");
    setEmail("");
    setPassword("");
    setRole("supervisor");
  }

  async function submit() {
    if (!name.trim() || !email.trim() || password.length < 6) return;
    setBusy(true);
    try {
      await createUser(name.trim(), email.trim(), password, role);
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
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            disabled={!name.trim() || !email.trim() || password.length < 6 || busy}
            onClick={submit}
          >
            {busy ? "Creating…" : "Create user"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
