import { collection, doc, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Role } from "@/lib/types";

export const usersQuery = () => query(collection(db, "users"), orderBy("name"));

export async function setUserRole(uid: string, role: Role): Promise<void> {
  await updateDoc(doc(db, "users", uid), { role });
}
