// One-time seed: creates dummy accounts, assigns roles, and adds sample
// suppliers/materials/deliveries. Safe to re-run (idempotent-ish).
//
// Requires:
//   1. Firestore enabled (Native mode) in the project.
//   2. Email/Password sign-in enabled.
//   3. A TEMPORARY permissive ruleset deployed (firestore.rules.seed) so this
//      script can write role docs. Lock back down with the real rules after.
//
// Run via:  node scripts/seed.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const text = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

const ACCOUNTS = [
  { email: "admin@flux.test", password: "Admin@12345", name: "Owner (Admin)", role: "admin" },
  { email: "super1@flux.test", password: "Super@12345", name: "Supervisor One", role: "supervisor" },
  { email: "super2@flux.test", password: "Super@12345", name: "Supervisor Two", role: "supervisor" },
];

async function ensureAccount(acct) {
  let uid;
  try {
    const cred = await createUserWithEmailAndPassword(auth, acct.email, acct.password);
    uid = cred.user.uid;
    console.log(`  created ${acct.email}`);
  } catch (e) {
    if (e.code === "auth/email-already-in-use") {
      const cred = await signInWithEmailAndPassword(auth, acct.email, acct.password);
      uid = cred.user.uid;
      console.log(`  exists  ${acct.email}`);
    } else {
      throw e;
    }
  }
  // Write own role doc while signed in as this user (temp rules allow it).
  await setDoc(doc(db, "users", uid), {
    email: acct.email,
    name: acct.name,
    role: acct.role,
    createdAt: serverTimestamp(),
  });
  return { ...acct, uid };
}

async function ensureNamed(coll, name, extra = {}) {
  const existing = await getDocs(query(collection(db, coll), where("name", "==", name)));
  if (!existing.empty) return existing.docs[0].id;
  const ref = await addDoc(collection(db, coll), {
    name,
    ...extra,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

async function main() {
  console.log("Seeding accounts…");
  const created = [];
  for (const acct of ACCOUNTS) created.push(await ensureAccount(acct));

  // Sign in as a supervisor to seed sample data.
  const sup = created.find((a) => a.role === "supervisor");
  await signInWithEmailAndPassword(auth, sup.email, sup.password);

  console.log("Seeding sample suppliers & materials…");
  const prathic = await ensureNamed("suppliers", "Prathic", { createdBy: sup.uid });
  const bgou = await ensureNamed("suppliers", "B Gou", { createdBy: sup.uid });
  const glue = await ensureNamed("materials", "Glue", { unit: "kg", createdBy: sup.uid });
  const cement = await ensureNamed("materials", "Cement", { unit: "Nos", createdBy: sup.uid });

  console.log("Seeding sample deliveries…");
  const today = new Date().toISOString().slice(0, 10);
  const sampleDeliveries = [
    { supplierId: prathic, supplierName: "Prathic", materialId: glue, materialName: "Glue", unit: "kg", quantity: 500 },
    { supplierId: bgou, supplierName: "B Gou", materialId: cement, materialName: "Cement", unit: "Nos", quantity: 50 },
  ];
  const existingDeliveries = await getDocs(collection(db, "deliveries"));
  if (existingDeliveries.empty) {
    for (const d of sampleDeliveries) {
      await addDoc(collection(db, "deliveries"), { ...d, date: today, createdBy: sup.uid, createdAt: serverTimestamp() });
    }
  } else {
    console.log("  deliveries already present, skipping");
  }

  console.log("\nDone. Dummy accounts:");
  for (const a of ACCOUNTS) console.log(`  ${a.role.padEnd(10)} ${a.email}  /  ${a.password}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
