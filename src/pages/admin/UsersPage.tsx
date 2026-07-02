import { useMemo, useState } from "react";
import { KeyRound, UserCog, UserPlus, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useCollectionData } from "@/hooks/useCollectionData";
import type { Role, UserDoc } from "@/lib/types";
import { usersQuery, setUserRole, disableUser, enableUser, resetUserPassword } from "@/services/users";
import { useFullAccessConfig } from "@/lib/accessContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
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
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CreateUserDialog } from "@/components/dialogs/CreateUserDialog";

function roleBadgeVariant(role: Role): "default" | "secondary" | "outline" {
  if (role === "admin") return "default";
  if (role === "pending") return "outline";
  return "secondary";
}

interface ResetPasswordDialogProps {
  uid: string;
  email: string;
  name: string;
}

function ResetPasswordDialog({ uid, email, name }: ResetPasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (password.length < 6) return;
    setBusy(true);
    try {
      await resetUserPassword(uid, email, password);
      toast.success(`Password reset for ${name}`);
      setOpen(false);
      setPassword("");
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "";
      if (msg.includes("No stored credentials")) {
        toast.error("No stored credentials — this user signed up independently");
      } else {
        toast.error("Could not reset password");
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
        if (!v) setPassword("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Reset password">
          <KeyRound className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password — {name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor={`rp-${uid}`}>New password</Label>
            <Input
              id={`rp-${uid}`}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              autoComplete="new-password"
            />
          </div>
          <Button
            className="w-full"
            disabled={password.length < 6 || busy}
            onClick={submit}
          >
            {busy ? "Resetting…" : "Reset password"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const { firebaseUser } = useAuth();
  const q = useMemo(() => usersQuery(), []);
  const { data: users, loading } = useCollectionData<UserDoc>(q);
  const [roleBusy, setRoleBusy] = useState<string | null>(null);
  const fullConfig = useFullAccessConfig();

  const activeUsers = useMemo(() => users.filter((u) => !u.disabled), [users]);
  const disabledUsers = useMemo(() => users.filter((u) => u.disabled), [users]);

  // Custom roles = union of roles in access config + roles currently assigned to users
  // This ensures a role is always selectable even if Firestore config hasn't loaded yet,
  // and users with an existing custom role can always see their role in the dropdown.
  const BUILTIN_ROLES = new Set(["admin", "supervisor", "pending"]);
  const customRoles = useMemo(() => {
    const fromConfig = Object.keys(fullConfig);
    const fromUsers = users.map((u) => u.role);
    const all = new Set([...fromConfig, ...fromUsers]);
    return [...all]
      .filter((r) => !BUILTIN_ROLES.has(r))
      .sort();
  }, [fullConfig, users]);

  async function changeRole(uid: string, role: Role) {
    setRoleBusy(uid);
    try {
      await setUserRole(uid, role);
      toast.success("Role updated");
    } catch {
      toast.error("Could not update role");
    } finally {
      setRoleBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Users &amp; access</h1>
        </div>
        <CreateUserDialog
          trigger={
            <Button size="sm">
              <UserPlus className="mr-1 h-4 w-4" /> Add user
            </Button>
          }
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {activeUsers.map((u) => {
            // u.id is the injected doc ID = Firebase UID (always reliable)
            const uid = u.id!;
            const isSelf = uid === firebaseUser?.uid;
            return (
              <Card key={uid}>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-medium">
                      {u.name}
                      {isSelf && (
                        <span className="text-xs text-muted-foreground">(you)</span>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={roleBadgeVariant(u.role)} className="capitalize hidden sm:flex">
                      {u.role.replace(/_/g, " ")}
                    </Badge>
                    <Select
                      value={u.role}
                      disabled={isSelf || roleBusy === uid}
                      onValueChange={(v) => changeRole(uid, v as Role)}
                    >
                      <SelectTrigger className="h-9 w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        {customRoles.map((r) => (
                          <SelectItem key={r} value={r} className="capitalize">
                            {r.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <ResetPasswordDialog uid={uid} email={u.email} name={u.name} />
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Disable user"
                          disabled={isSelf}
                        >
                          <UserX className="h-4 w-4 text-destructive" />
                        </Button>
                      }
                      title={`Disable ${u.name}?`}
                      description="They will be blocked from the app immediately. You can re-enable them at any time."
                      confirmLabel="Disable"
                      destructive
                      onConfirm={async () => {
                        await disableUser(uid);
                        toast.success(`${u.name} disabled`);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {disabledUsers.length > 0 && (
            <>
              <p className="pt-2 text-xs font-medium text-muted-foreground">
                Disabled users
              </p>
              {disabledUsers.map((u) => {
                const uid = u.id!;
                return (
                  <Card key={uid} className="opacity-60">
                    <CardContent className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{u.name}</p>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            disabled
                          </Badge>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Enable user"
                        onClick={async () => {
                          await enableUser(uid);
                          toast.success(`${u.name} enabled`);
                        }}
                      >
                        <UserCheck className="h-4 w-4 text-emerald-600" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
