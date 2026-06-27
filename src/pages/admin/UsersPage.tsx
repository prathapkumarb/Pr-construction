import { useMemo, useState } from "react";
import { UserCog } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useCollectionData } from "@/hooks/useCollectionData";
import type { Role, UserDoc } from "@/lib/types";
import { usersQuery, setUserRole } from "@/services/users";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const roleVariant: Record<Role, "default" | "secondary" | "outline"> = {
  admin: "default",
  supervisor: "secondary",
  pending: "outline",
};

export default function UsersPage() {
  const { firebaseUser } = useAuth();
  const query = useMemo(() => usersQuery(), []);
  const { data: users, loading } = useCollectionData<UserDoc>(query);
  const [busy, setBusy] = useState<string | null>(null);

  async function changeRole(uid: string, role: Role) {
    setBusy(uid);
    try {
      await setUserRole(uid, role);
      toast.success("Role updated");
    } catch {
      toast.error("Could not update role");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserCog className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Users &amp; access</h1>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const isSelf = u.uid === firebaseUser?.uid;
            return (
              <Card key={u.uid}>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-medium">
                      {u.name}
                      {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={roleVariant[u.role]} className="capitalize">
                      {u.role}
                    </Badge>
                    <Select
                      value={u.role}
                      disabled={isSelf || busy === u.uid}
                      onValueChange={(v) => changeRole(u.uid, v as Role)}
                    >
                      <SelectTrigger className="h-9 w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
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
