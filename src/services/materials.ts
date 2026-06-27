import { addDoc, collection, orderBy, query, serverTimestamp } from "firebase/firestore";
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
