import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
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

/** Admin: delete a supplier. Callers should ensure it has no deliveries first. */
export async function deleteSupplier(id: string): Promise<void> {
  await deleteDoc(doc(db, "suppliers", id));
}

/** Commit batched operations in chunks of <=450 to stay under Firestore limits. */
async function commitChunked(ops: ((batch: ReturnType<typeof writeBatch>) => void)[]) {
  for (let i = 0; i < ops.length; i += 450) {
    const batch = writeBatch(db);
    for (const op of ops.slice(i, i + 450)) op(batch);
    await batch.commit();
  }
}

/**
 * Admin: merge a duplicate (source) supplier into the correct (target) one.
 * Reassigns all deliveries and payments, then deletes the source supplier.
 * deliveryFinancials are keyed by delivery id, so they follow automatically.
 */
export async function mergeSuppliers(sourceId: string, target: Supplier): Promise<void> {
  if (sourceId === target.id) return;

  const [deliveries, payments] = await Promise.all([
    getDocs(query(collection(db, "deliveries"), where("supplierId", "==", sourceId))),
    getDocs(query(collection(db, "payments"), where("supplierId", "==", sourceId))),
  ]);

  const ops: ((batch: ReturnType<typeof writeBatch>) => void)[] = [];
  for (const d of deliveries.docs) {
    ops.push((batch) =>
      batch.update(d.ref, { supplierId: target.id, supplierName: target.name }),
    );
  }
  for (const p of payments.docs) {
    ops.push((batch) => batch.update(p.ref, { supplierId: target.id }));
  }
  ops.push((batch) => batch.delete(doc(db, "suppliers", sourceId)));

  await commitChunked(ops);
}
