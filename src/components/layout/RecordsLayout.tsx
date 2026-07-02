import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useAccess } from "@/lib/accessContext";
import { cn } from "@/lib/utils";

interface TabDef {
  to: string;
  label: string;
  /** If true, only admin sees this tab regardless of access config */
  adminOnly?: boolean;
  /** access.tabs key to check for non-admin users */
  accessKey?: keyof ReturnType<typeof useAccess>["tabs"];
}

const ALL_TABS: TabDef[] = [
  { to: "/records/deliveries", label: "Deliveries", accessKey: "subDeliveries" },
  { to: "/records/suppliers", label: "Suppliers", adminOnly: true },
  { to: "/records/materials", label: "Materials", accessKey: "subMaterials" },
  { to: "/records/payments", label: "Payments", accessKey: "subPayments" },
];

// Paths where the tab bar should appear
const TAB_PATHS = [
  "/records/deliveries",
  "/records/suppliers",
  "/records/materials",
  "/records/payments",
];

export function RecordsLayout() {
  const { role } = useAuth();
  const access = useAccess();
  const { pathname } = useLocation();

  const isAdmin = role === "admin";

  const tabs = ALL_TABS.filter((tab) => {
    if (tab.adminOnly) return isAdmin;
    if (isAdmin) return true;
    if (tab.accessKey) return access.tabs[tab.accessKey];
    return true;
  });

  const showTabs = tabs.length > 1 && TAB_PATHS.includes(pathname);

  return (
    <div className="space-y-4">
      {showTabs && (
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end
              className={({ isActive }) =>
                cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-accent",
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      )}
      <Outlet />
    </div>
  );
}
