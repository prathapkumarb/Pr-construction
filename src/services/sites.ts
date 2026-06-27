import {
  addDoc,
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const sitesQuery = () => query(collection(db, "sites"), orderBy("name"));

/** Create a new active site. Returns the new id. */
export async function createSite(name: string, createdBy: string): Promise<string> {
  const ref = await addDoc(collection(db, "sites"), {
    name: name.trim(),
    active: true,
    createdBy,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Toggle a site's active status. */
export async function setSiteActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, "sites", id), { active });
}
