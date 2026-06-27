import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
} from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    .split("\n")
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);
await signInWithEmailAndPassword(auth, "admin@flux.test", "Admin@12345");

async function rename(id, name, unit) {
  const aff = await getDocs(query(collection(db, "deliveries"), where("materialId", "==", id)));
  const b = writeBatch(db);
  b.update(doc(db, "materials", id), { name, unit });
  aff.docs.forEach((d) => b.update(d.ref, { materialName: name, unit }));
  await b.commit();
  return aff.size;
}

const mats = await getDocs(collection(db, "materials"));
const glue = mats.docs.find((d) => ["Glue", "Adhesive"].includes(d.data().name));
if (!glue) {
  console.log("no Glue material found");
  process.exit(0);
}
const id = glue.id;
const n1 = await rename(id, "Adhesive", "kg");
let dels = await getDocs(query(collection(db, "deliveries"), where("materialId", "==", id)));
const ok1 = dels.docs.every((d) => d.data().materialName === "Adhesive");
const n2 = await rename(id, "Glue", "kg");
dels = await getDocs(query(collection(db, "deliveries"), where("materialId", "==", id)));
const ok2 = dels.docs.every((d) => d.data().materialName === "Glue");
console.log(`cascade to ${n1} deliveries -> renamed Adhesive: ${ok1 ? "PASS" : "FAIL"}`);
console.log(`reverted ${n2} deliveries -> back to Glue: ${ok2 ? "PASS" : "FAIL"}`);
process.exit(ok1 && ok2 ? 0 : 1);
