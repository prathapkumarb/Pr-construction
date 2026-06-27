import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const paymentsQuery = () =>
  query(collection(db, "payments"), orderBy("date", "desc"));

export interface PaymentInput {
  supplierId: string;
  amount: number;
  date: string; // yyyy-MM-dd
  note?: string;
}

export async function createPayment(input: PaymentInput, createdBy: string): Promise<string> {
  const ref = await addDoc(collection(db, "payments"), {
    ...input,
    note: input.note ?? "",
    createdBy,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePayment(id: string, input: PaymentInput): Promise<void> {
  await updateDoc(doc(db, "payments", id), { ...input, note: input.note ?? "" });
}

export async function deletePayment(id: string): Promise<void> {
  await deleteDoc(doc(db, "payments", id));
}
