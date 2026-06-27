import { collection, deleteDoc, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { lineTotal } from "@/lib/ledger";

export const financialsCollection = () => collection(db, "deliveryFinancials");
/** Query for all financials (admin only). */
export const financialsQuery = () => collection(db, "deliveryFinancials");

/**
 * Admin: set/update the price of a delivery. The financial doc id mirrors the
 * delivery id, so it follows the delivery on merges and is removed on delete.
 */
export async function setDeliveryPrice(
  deliveryId: string,
  price: number,
  quantity: number,
): Promise<void> {
  await setDoc(doc(db, "deliveryFinancials", deliveryId), {
    price,
    lineTotal: lineTotal(quantity, price),
  });
}

export async function clearDeliveryPrice(deliveryId: string): Promise<void> {
  await deleteDoc(doc(db, "deliveryFinancials", deliveryId));
}
