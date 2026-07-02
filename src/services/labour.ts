import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── Queries ──────────────────────────────────────────────────────────────────

export const labourWorkersQuery = () =>
  query(collection(db, "labourWorkers"), orderBy("name", "asc"));

export const labourAttendanceQuery = () =>
  query(collection(db, "labourAttendance"), orderBy("createdAt", "desc"));

/** All attendance for one worker — used for earnings calculation. */
export const labourAttendanceByWorkerQuery = (workerId: string) =>
  query(collection(db, "labourAttendance"), where("workerId", "==", workerId));

export const labourPaymentsQuery = () =>
  query(collection(db, "labourPayments"), orderBy("createdAt", "desc"));

/** Rate history for one worker, oldest-first so caller can walk forward in time. */
export const labourRatesByWorkerQuery = (workerId: string) =>
  query(
    collection(db, "labourRates"),
    where("workerId", "==", workerId),
    orderBy("effectiveFrom", "asc"),
  );

// ─── Workers ──────────────────────────────────────────────────────────────────

export interface NewLabourWorker {
  name: string;
  phone?: string;
  idType?: string;
  idNumber?: string;
  address?: string;
  role?: string;
  ratePerDay?: number;
}

export async function createLabourWorker(
  input: NewLabourWorker,
  createdBy: string,
): Promise<string> {
  const data: Record<string, unknown> = { name: input.name, createdBy, createdAt: serverTimestamp() };
  if (input.phone) data.phone = input.phone;
  if (input.idType) data.idType = input.idType;
  if (input.idNumber) data.idNumber = input.idNumber;
  if (input.address) data.address = input.address;
  if (input.role) data.role = input.role;
  if (input.ratePerDay != null) data.ratePerDay = input.ratePerDay;
  const ref = await addDoc(collection(db, "labourWorkers"), data);
  return ref.id;
}

export async function updateLabourWorker(
  id: string,
  input: NewLabourWorker,
): Promise<void> {
  const data: Record<string, unknown> = { name: input.name };
  if (input.phone) data.phone = input.phone;
  if (input.idType) data.idType = input.idType;
  if (input.idNumber) data.idNumber = input.idNumber;
  if (input.address) data.address = input.address;
  if (input.role) data.role = input.role;
  if (input.ratePerDay != null) data.ratePerDay = input.ratePerDay;
  await updateDoc(doc(db, "labourWorkers", id), data);
}

export async function deleteLabourWorker(id: string): Promise<void> {
  await deleteDoc(doc(db, "labourWorkers", id));
}

// ─── Rate history ─────────────────────────────────────────────────────────────

export interface NewLabourRate {
  workerId: string;
  workerName: string;
  ratePerDay: number;
  effectiveFrom: string; // yyyy-MM-dd
  note?: string;
}

export async function createLabourRate(
  input: NewLabourRate,
  createdBy: string,
): Promise<void> {
  const data: Record<string, unknown> = {
    workerId: input.workerId,
    workerName: input.workerName,
    ratePerDay: input.ratePerDay,
    effectiveFrom: input.effectiveFrom,
    createdBy,
    createdAt: serverTimestamp(),
  };
  if (input.note) data.note = input.note;
  await addDoc(collection(db, "labourRates"), data);
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface NewLabourAttendance {
  workerId: string;
  workerName: string;
  attendance: "present" | "absent";
  ot: 0 | 0.5 | 1;
  date: string;
  siteName?: string;
}

export async function createLabourAttendance(
  input: NewLabourAttendance,
  createdBy: string,
): Promise<string> {
  // Deterministic ID = workerId_date → one record per worker per day (natural upsert)
  const docId = `${input.workerId}_${input.date}`;
  const data: Record<string, unknown> = {
    workerId: input.workerId,
    workerName: input.workerName,
    attendance: input.attendance,
    ot: input.ot,
    date: input.date,
    createdBy,
    createdAt: serverTimestamp(),
  };
  if (input.siteName) data.siteName = input.siteName;
  await setDoc(doc(db, "labourAttendance", docId), data);
  return docId;
}

export async function updateLabourAttendance(
  id: string,
  input: NewLabourAttendance,
): Promise<void> {
  const data: Record<string, unknown> = {
    workerId: input.workerId,
    workerName: input.workerName,
    attendance: input.attendance,
    ot: input.ot,
    date: input.date,
  };
  if (input.siteName) data.siteName = input.siteName;
  await updateDoc(doc(db, "labourAttendance", id), data);
}

export async function deleteLabourAttendance(id: string): Promise<void> {
  await deleteDoc(doc(db, "labourAttendance", id));
}

// ─── Payments (advances) ──────────────────────────────────────────────────────

export interface NewLabourPayment {
  workerId: string;
  workerName: string;
  ratePerDay: number;
  advance: number;
  deducted: number;
  date: string;
  note?: string;
}

export async function createLabourPayment(
  input: NewLabourPayment,
  createdBy: string,
): Promise<string> {
  const data: Record<string, unknown> = {
    workerId: input.workerId,
    workerName: input.workerName,
    ratePerDay: input.ratePerDay,
    advance: input.advance,
    deducted: input.deducted,
    date: input.date,
    createdBy,
    createdAt: serverTimestamp(),
  };
  if (input.note) data.note = input.note;
  const ref = await addDoc(collection(db, "labourPayments"), data);
  return ref.id;
}

export async function updateLabourPayment(
  id: string,
  input: NewLabourPayment,
): Promise<void> {
  const data: Record<string, unknown> = {
    workerId: input.workerId,
    workerName: input.workerName,
    ratePerDay: input.ratePerDay,
    advance: input.advance,
    deducted: input.deducted,
    date: input.date,
  };
  if (input.note) data.note = input.note;
  await updateDoc(doc(db, "labourPayments", id), data);
}

export async function deleteLabourPayment(id: string): Promise<void> {
  await deleteDoc(doc(db, "labourPayments", id));
}
