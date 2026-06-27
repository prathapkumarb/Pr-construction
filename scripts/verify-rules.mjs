// Verifies the production security rules: supervisors cannot read money
// collections; admins can; both can read suppliers/deliveries.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, getDocs, collection } from "firebase/firestore";

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

async function canRead(coll) {
  try {
    await getDocs(collection(db, coll));
    return true;
  } catch (e) {
    if (e.code === "permission-denied") return false;
    throw e;
  }
}

function check(label, actual, expected) {
  const ok = actual === expected;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label} (read=${actual}, expected=${expected})`);
  return ok;
}

async function main() {
  let allOk = true;

  await signInWithEmailAndPassword(auth, "super1@flux.test", "Super@12345");
  console.log("As SUPERVISOR:");
  allOk &= check("suppliers readable", await canRead("suppliers"), true);
  allOk &= check("deliveries readable", await canRead("deliveries"), true);
  allOk &= check("deliveryFinancials BLOCKED", await canRead("deliveryFinancials"), false);
  allOk &= check("payments BLOCKED", await canRead("payments"), false);
  await signOut(auth);

  await signInWithEmailAndPassword(auth, "admin@flux.test", "Admin@12345");
  console.log("As ADMIN:");
  allOk &= check("suppliers readable", await canRead("suppliers"), true);
  allOk &= check("deliveryFinancials readable", await canRead("deliveryFinancials"), true);
  allOk &= check("payments readable", await canRead("payments"), true);

  console.log(allOk ? "\nAll rule checks passed." : "\nSOME CHECKS FAILED.");
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
