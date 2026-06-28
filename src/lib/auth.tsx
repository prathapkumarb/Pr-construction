import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Role, UserDoc } from "@/lib/types";

interface AuthState {
  firebaseUser: FirebaseUser | null;
  userDoc: UserDoc | null;
  role: Role | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/** Ensure a users/{uid} doc exists; create as "pending" on first login.
 *  Does NOT backfill uid into existing docs — only admins can update user docs,
 *  so a backfill would fail with permission-denied for supervisors/pending users.
 *  Use u.id (the injected Firestore doc ID) as the reliable UID everywhere. */
async function ensureUserDoc(user: FirebaseUser): Promise<void> {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email ?? "",
      name: user.displayName ?? user.email?.split("@")[0] ?? "User",
      role: "pending" as Role,
      createdAt: serverTimestamp(),
    });
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubDoc?.();
      unsubDoc = undefined;

      if (!user) {
        setFirebaseUser(null);
        setUserDoc(null);
        setLoading(false);
        return;
      }

      setFirebaseUser(user);
      await ensureUserDoc(user);

      unsubDoc = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) {
          setUserDoc({ uid: user.uid, ...(snap.data() as Omit<UserDoc, "uid">) });
        } else {
          setUserDoc(null);
        }
        setLoading(false);
      });
    });

    return () => {
      unsubDoc?.();
      unsubAuth();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      firebaseUser,
      userDoc,
      role: userDoc?.role ?? null,
      loading,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      signOut: async () => {
        await fbSignOut(auth);
      },
    }),
    [firebaseUser, userDoc, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
