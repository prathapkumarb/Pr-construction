import { Navigate } from "react-router-dom";
import { Clock, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PendingPage() {
  const { role, userDoc, signOut, loading } = useAuth();

  if (!loading && role && role !== "pending") return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="items-center space-y-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </span>
          <CardTitle>Waiting for access</CardTitle>
          <CardDescription>
            Your account ({userDoc?.email}) is registered. An administrator needs to grant you
            access before you can start. Please check back shortly.
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
