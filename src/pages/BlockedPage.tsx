import { ShieldOff, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BlockedPage() {
  const { userDoc, signOut } = useAuth();

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="items-center space-y-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ShieldOff className="h-6 w-6 text-muted-foreground" />
          </span>
          <CardTitle>Account disabled</CardTitle>
          <CardDescription>
            {userDoc?.email
              ? `The account (${userDoc.email}) has been disabled.`
              : "Your account has been disabled."}{" "}
            Please contact an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
