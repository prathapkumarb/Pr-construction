import type { Timestamp } from "firebase/firestore";

export interface LabourWorker {
  id: string;
  name: string;
  phone?: string;
  idType?: string;   // e.g. "Aadhar", "PAN", "Passport"
  idNumber?: string;
  address?: string;
  role?: string;     // e.g. "Mason", "Carpenter"
  ratePerDay?: number; // current daily rate
  createdAt?: Timestamp;
  createdBy?: string;
}

/** One entry in the worker's rate-change history. */
export interface LabourRate {
  id: string;
  workerId: string;
  workerName: string;
  ratePerDay: number;
  effectiveFrom: string; // yyyy-MM-dd
  note?: string;
  createdAt?: Timestamp;
  createdBy: string;
}

export interface LabourAttendance {
  id: string;
  workerId: string;
  workerName: string;
  attendance: "present" | "absent";
  ot: 0 | 0.5 | 1;
  date: string; // yyyy-MM-dd
  siteName?: string;
  createdBy: string;
  createdAt?: Timestamp;
}

export interface LabourPayment {
  id: string;
  workerId: string;
  workerName: string;
  ratePerDay: number;  // snapshot rate at time of advance
  advance: number;     // advance amount given
  deducted: number;    // amount recovered from advance so far
  date: string;        // advance date
  note?: string;
  createdBy: string;
  createdAt?: Timestamp;
}
