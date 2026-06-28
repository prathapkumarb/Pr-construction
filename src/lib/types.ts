import type { Timestamp } from "firebase/firestore";

export type Role = "admin" | "supervisor" | "pending";

export interface UserDoc {
  /** Injected by useCollectionData (doc ID = Firebase UID). Not set via useAuth directly. */
  id?: string;
  /** Stored in Firestore doc data. May be absent for legacy docs; always set going forward. */
  uid?: string;
  email: string;
  name: string;
  role: Role;
  disabled?: boolean;
  createdAt?: Timestamp;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
  /** false = inactive; undefined/true = active (legacy docs treated as active) */
  active?: boolean;
  createdAt?: Timestamp;
  createdBy?: string;
}

export interface Site {
  id: string;
  name: string;
  active: boolean;
  createdAt?: Timestamp;
  createdBy?: string;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  createdAt?: Timestamp;
  createdBy?: string;
}

export interface Delivery {
  id: string;
  supplierId: string;
  supplierName: string;
  materialId: string;
  materialName: string;
  unit: string;
  quantity: number;
  /** ISO date string (yyyy-MM-dd) for the delivery day */
  date: string;
  siteName?: string;
  createdBy: string;
  createdAt?: Timestamp;
}

/** Admin-only: pricing for a delivery. Doc id === delivery id. */
export interface DeliveryFinancial {
  id: string;
  price: number;
  lineTotal: number;
}

/** Admin-only: a payment made to a supplier ("Given"). */
export interface Payment {
  id: string;
  supplierId: string;
  amount: number;
  /** ISO date string (yyyy-MM-dd) */
  date: string;
  note?: string;
  createdBy: string;
  createdAt?: Timestamp;
}
