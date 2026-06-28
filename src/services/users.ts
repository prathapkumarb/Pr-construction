import { deleteApp, initializeApp } from "firebase/app";
import {
  type User as FirebaseUser,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db, firebaseConfig } from "@/lib/firebase";
import type { Role } from "@/lib/types";

export const usersQuery = () => query(collection(db, "users"), orderBy("name"));

export async function setUserRole(uid: string, role: Role): Promise<void> {
  await updateDoc(doc(db, "users", uid), { role });
}

export async function disableUser(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { disabled: true });
}

export async function enableUser(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { disabled: false });
}

/** Obtain a fresh Auth user via the secondary app, with orphan recovery.
 *
 *  If "email already in use" is thrown, we attempt to sign in with the same
 *  password. Success → orphaned account from a prior failed write → delete &
 *  recreate. Failure → genuine duplicate → rethrow original error. */
async function acquireAuthUser(
  secondaryAuth: ReturnType<typeof getAuth>,
  email: string,
  password: string,
): Promise<FirebaseUser> {
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    return cred.user;
  } catch (createErr: unknown) {
    if ((createErr as { code?: string })?.code !== "auth/email-already-in-use") throw createErr;

    // Possibly an orphaned Auth account from a prior failed Firestore write.
    // Try signing in with the same password to confirm we own it.
    try {
      const signInCred = await signInWithEmailAndPassword(secondaryAuth, email, password);
      await signInCred.user.delete();
      const freshCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      return freshCred.user;
    } catch (_recoverErr: unknown) {
      // Sign-in failed → genuine duplicate (different password) → rethrow original
      throw createErr;
    }
  }
}

/** Create a Firebase Auth user + Firestore docs via a secondary app instance
 *  so the admin session is not disturbed.
 *  Rolls back the Auth user if either Firestore write fails. */
export async function createUser(
  name: string,
  email: string,
  password: string,
  role: Role,
): Promise<void> {
  const appName = `secondary-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, appName);
  const secondaryAuth = getAuth(secondaryApp);
  let authUser: FirebaseUser | null = null;

  try {
    authUser = await acquireAuthUser(secondaryAuth, email.trim(), password);

    await setDoc(doc(db, "users", authUser.uid), {
      uid: authUser.uid,
      email: email.trim(),
      name: name.trim(),
      role,
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, "userCredentials", authUser.uid), { password });
    await signOut(secondaryAuth);
  } catch (err: unknown) {
    // Rollback Auth user so the email is clean to retry
    const u = authUser;
    if (u) {
      try { await u.delete(); } catch (_deleteErr: unknown) { /* best-effort */ }
    }
    throw err;
  } finally {
    await deleteApp(secondaryApp);
  }
}

/** Reset a user's password. Reads the stored credential, signs in via a
 *  secondary app, updates the password, then updates the stored credential. */
export async function resetUserPassword(
  uid: string,
  email: string,
  newPassword: string,
): Promise<void> {
  const credSnap = await getDoc(doc(db, "userCredentials", uid));
  const oldPassword = credSnap.data()?.password as string | undefined;
  if (!oldPassword) {
    throw new Error("No stored credentials for this user");
  }

  const appName = `secondary-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, appName);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    await signInWithEmailAndPassword(secondaryAuth, email, oldPassword);
    await updatePassword(secondaryAuth.currentUser!, newPassword);
    await updateDoc(doc(db, "userCredentials", uid), { password: newPassword });
    await signOut(secondaryAuth);
  } finally {
    await deleteApp(secondaryApp);
  }
}
