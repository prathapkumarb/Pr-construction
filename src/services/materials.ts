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

export async function updateMaterial(
  id: string,
  details: { name: string; unit: string },
): Promise<void> {
  await updateDoc(doc(db, "materials", id), {
    name: details.name.trim(),
    unit: details.unit.trim(),
  });
}

export async function deleteMaterial(id: string): Promise<void> {
  await deleteDoc(doc(db, "materials", id));
}
