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
import type { Supplier } from "@/lib/types";

export const suppliersQuery = () => query(collection(db, "suppliers"), orderBy("name"));

/** Create a supplier on the fly (name only). Returns the new id. */
export async function createSupplier(name: string, createdBy: string): Promise<string> {
  const ref = await addDoc(collection(db, "suppliers"), {
    name: name.trim(),
    createdBy,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Admin: update supplier details. */
export async function updateSupplier(
  id: string,
  details: Partial<Pick<Supplier, "name" | "phone" | "address" | "gstNumber" | "notes">>,
): Promise<void> {
  await updateDoc(doc(db, "suppliers", id), details);
}
