import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_ROLE_ACCESS, type AccessConfig, type RoleAccess } from "@/lib/access";

const accessRef = () => doc(db, "settings", "accessControl");

function mergeRole(raw: unknown): RoleAccess {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    tabs: { ...DEFAULT_ROLE_ACCESS.tabs, ...((r.tabs ?? {}) as object) },
    fields: { ...DEFAULT_ROLE_ACCESS.fields, ...((r.fields ?? {}) as object) },
  };
}

function mergeWithDefaults(data: Record<string, unknown>): AccessConfig {
  const result: AccessConfig = {};
  for (const [role, value] of Object.entries(data)) {
    result[role] = mergeRole(value);
  }
  return result;
}

export function subscribeAccessConfig(cb: (config: AccessConfig) => void): () => void {
  return onSnapshot(accessRef(), (snap) => {
    cb(snap.exists() ? mergeWithDefaults(snap.data()) : {});
  });
}

export async function saveAccessConfig(config: AccessConfig): Promise<void> {
  await setDoc(accessRef(), config);
}
