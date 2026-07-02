import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  HardHat,
  Ellipsis,
  UserCog,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AccessProvider, useAccess } from "@/lib/accessContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Building2;
  activePrefix?: string;
}

const adminNav: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/records/deliveries", label: "Suppliers", icon: Building2, activePrefix: "/records" },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/labour", label: "Labour", icon: HardHat },
  { to: "/more", label: "More", icon: Ellipsis },
];

function AppContent() {
  const { role, userDoc, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const access = useAccess();

  // Supervisor nav respects per-role access config from Firestore
  const supervisorNav: NavItem[] = [
    ...(access.tabs.suppliers
      ? [{ to: "/records/deliveries", label: "Suppliers", icon: Building2, activePrefix: "/records" } as NavItem]
      : []),
    ...(access.tabs.labour
      ? [{ to: "/labour", label: "Labour", icon: HardHat } as NavItem]
      : []),
    ...(access.tabs.more
      ? [{ to: "/more", label: "More", icon: Ellipsis } as NavItem]
      : []),
  ];

  const items = role === "admin" ? adminNav : supervisorNav;

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            F
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Flux Ledger</p>
            <p className="text-[11px] capitalize text-muted-foreground">
              {userDoc?.name} · {role}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {role === "admin" && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Users"
              onClick={() => navigate("/users")}
            >
              <UserCog className="h-5 w-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => signOut()}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-4">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around">
          {items.map(({ to, label, icon: Icon, activePrefix }) => {
            const active = activePrefix
              ? pathname.startsWith(activePrefix)
              : pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                end={!activePrefix}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function AppLayout() {
  return (
    <AccessProvider>
      <AppContent />
    </AccessProvider>
  );
}
