import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { ADMIN_ACCESS, DEFAULT_ROLE_ACCESS, type AccessConfig, type RoleAccess } from "@/lib/access";
import { subscribeAccessConfig } from "@/services/access";

const AccessContext = createContext<RoleAccess>(DEFAULT_ROLE_ACCESS);
const FullAccessContext = createContext<AccessConfig>({});

/**
 * Wrap the authenticated layout with this provider so any child can call
 * useAccess() (current user's permissions) or useFullAccessConfig() (all roles).
 */
export function AccessProvider({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const [access, setAccess] = useState<RoleAccess>(
    role === "admin" ? ADMIN_ACCESS : DEFAULT_ROLE_ACCESS,
  );
  const [fullConfig, setFullConfig] = useState<AccessConfig>({});

  useEffect(() => {
    if (role === "admin") setAccess(ADMIN_ACCESS);

    return subscribeAccessConfig((config) => {
      setFullConfig(config);
      if (role !== "admin") {
        setAccess((role ? config[role] : undefined) ?? DEFAULT_ROLE_ACCESS);
      }
    });
  }, [role]);

  return (
    <FullAccessContext.Provider value={fullConfig}>
      <AccessContext.Provider value={access}>
        {children}
      </AccessContext.Provider>
    </FullAccessContext.Provider>
  );
}

/** Current user's effective access permissions. */
export function useAccess(): RoleAccess {
  return useContext(AccessContext);
}

/** Full access config for all roles — use in admin configuration screens. */
export function useFullAccessConfig(): AccessConfig {
  return useContext(FullAccessContext);
}
