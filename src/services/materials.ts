import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const materialsQuery = () => query(collection(db, "materials"), orderBy("name"));

/** Create a material on the fly with its unit. Returns the new id. */
export async function createMaterial(
  name: string,
  unit: string,
  createdBy: string,
): Promise<string> {
  const ref = await addDoc(collection(db, "materials"), {
    name: name.trim(),
    unit: unit.trim(),
    createdBy,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Update a material and cascade its name/unit to every delivery that
 * references it, so denormalized delivery records stay consistent.
 */
export async function updateMaterial(
  id: string,
  details: { name: string; unit: string },
): Promise<void> {
  const name = details.name.trim();
  const unit = details.unit.trim();

  const affected = await getDocs(
    query(collection(db, "deliveries"), where("materialId", "==", id)),
  );

  const ops: ((batch: ReturnType<typeof writeBatch>) => void)[] = [
    (batch) => batch.update(doc(db, "materials", id), { name, unit }),
  ];
  for (const d of affected.docs) {
    ops.push((batch) => batch.update(d.ref, { materialName: name, unit }));
  }

  for (let i = 0; i < ops.length; i += 450) {
    const batch = writeBatch(db);
    for (const op of ops.slice(i, i + 450)) op(batch);
    await batch.commit();
  }
}

export async function deleteMaterial(id: string): Promise<void> {
  await deleteDoc(doc(db, "materials", id));
}
