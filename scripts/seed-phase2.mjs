// Phase 2 verification + demo data: as ADMIN, price the seeded deliveries and
// add a sample payment, then read back balances. Confirms the admin-only write
// path works under production rules. Idempotent.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  getDocs,
  collection,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
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

const PRICES = { Glue: 64, Cement: 37 };

async function main() {
  await signInWithEmailAndPassword(auth, "admin@flux.test", "Admin@12345");
  console.log("Signed in as admin.");

  const deliveries = await getDocs(collection(db, "deliveries"));
  for (const d of deliveries.docs) {
    const data = d.data();
    const price = PRICES[data.materialName];
    if (!price) continue;
    const total = Math.round(data.quantity * price * 100) / 100;
    await setDoc(doc(db, "deliveryFinancials", d.id), { price, lineTotal: total });
    console.log(`  priced ${data.materialName} x${data.quantity} @${price} = ${total}`);
  }

  const payments = await getDocs(collection(db, "payments"));
  if (payments.empty) {
    const prathic = deliveries.docs.find((d) => d.data().supplierName === "Prathic");
    if (prathic) {
      await addDoc(collection(db, "payments"), {
        supplierId: prathic.data().supplierId,
        amount: 20000,
        date: new Date().toISOString().slice(0, 10),
        note: "Advance",
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      console.log("  recorded sample payment to Prathic: 20000");
    }
  } else {
    console.log("  payments already present, skipping");
  }

  // Read back to confirm admin can see money.
  const fins = await getDocs(collection(db, "deliveryFinancials"));
  const total = fins.docs.reduce((s, f) => s + (f.data().lineTotal || 0), 0);
  console.log(`\nAdmin read-back OK. Total priced value: ₹${total}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("FAILED:", e.code || e.message);
  process.exit(1);
});
