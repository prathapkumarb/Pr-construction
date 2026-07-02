import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/labour/attendance", label: "Attendance" },
  { to: "/labour/workers", label: "Human Resources" },
  { to: "/labour/payments", label: "Payments" },
];

const TAB_ROOT_PATHS = new Set(TABS.map((t) => t.to));

export function LabourLayout() {
  const { pathname } = useLocation();
  const showTabs = TAB_ROOT_PATHS.has(pathname);

  return (
    <div className="space-y-4">
      {showTabs && (
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => (
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
