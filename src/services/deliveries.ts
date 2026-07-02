import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { lineTotal } from "@/lib/ledger";

export const deliveriesQuery = () =>
  query(collection(db, "deliveries"), orderBy("date", "desc"), orderBy("createdAt", "desc"));

export interface NewDelivery {
  supplierId: string;
  supplierName: string;
  materialId: string;
  materialName: string;
  unit: string;
  quantity: number | string;
  date: string; // yyyy-MM-dd
  siteName?: string;
}

/** Record a physical delivery. No money is stored here. */
export async function createDelivery(input: NewDelivery, createdBy: string): Promise<string> {
  const ref = await addDoc(collection(db, "deliveries"), {
    ...input,
    createdBy,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Admin: edit a delivery. If the quantity changes and a price was already set,
 * the line total is recomputed so the financial stays consistent.
 */
export async function updateDelivery(id: string, input: NewDelivery): Promise<void> {
  await updateDoc(doc(db, "deliveries", id), { ...input });

  const finRef = doc(db, "deliveryFinancials", id);
  const finSnap = await getDoc(finRef);
  if (finSnap.exists() && typeof input.quantity === "number") {
    const price = finSnap.data().price as number;
    await updateDoc(finRef, { lineTotal: lineTotal(input.quantity, price) });
  }
}

/** Admin: delete a delivery and its financial line (if any). */
export async function deleteDelivery(id: string): Promise<void> {
  await deleteDoc(doc(db, "deliveries", id));
  const finRef = doc(db, "deliveryFinancials", id);
  const finSnap = await getDoc(finRef);
  if (finSnap.exists()) await deleteDoc(finRef);
}
