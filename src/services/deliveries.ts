import {
  addDoc,
  collection,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const deliveriesQuery = () =>
  query(collection(db, "deliveries"), orderBy("date", "desc"), orderBy("createdAt", "desc"));

export interface NewDelivery {
  supplierId: string;
  supplierName: string;
  materialId: string;
  materialName: string;
  unit: string;
  quantity: number;
  date: string; // yyyy-MM-dd
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
