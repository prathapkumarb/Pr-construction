import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

function FullScreenLoader() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Requires a signed-in, non-disabled user. Redirects to /login or /blocked. */
export function RequireAuth() {
  const { firebaseUser, userDoc, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (userDoc?.disabled) return <Navigate to="/blocked" replace />;
  return <Outlet />;
}

/**
 * Requires the user's role to be in the allowed list.
 * Pass "admin" for admin-only routes.
 * Pass "*" to allow any non-pending, active role (admin, supervisor, custom roles like hr/site_manager).
 */
export function RequireRole({ allow }: { allow: string[] }) {
  const { role, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (role === "pending" || role === null) return <Navigate to="/pending" replace />;
  if (allow.includes("*")) return <Outlet />;
  if (!allow.includes(role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Sends the signed-in user to the right landing page for their role. */
export function RoleHome() {
  const { role, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (role === "admin") return <Navigate to="/dashboard" replace />;
  if (role === "pending" || role === null) return <Navigate to="/pending" replace />;
  // Any other role (supervisor, hr, site_manager, etc.)
  return <Navigate to="/records/deliveries" replace />;
}
