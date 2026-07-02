export interface TabAccess {
  /** Main "Suppliers" bottom-nav tab */
  suppliers: boolean;
  labour: boolean;
  more: boolean;
  /** Sub-tabs inside the Suppliers tab */
  subDeliveries: boolean;
  subMaterials: boolean;
  subPayments: boolean;
}

export interface FieldAccess {
  /** Price per unit and total amount fields in the delivery form + delivery financial data */
  deliveryPricing: boolean;
}

export interface RoleAccess {
  tabs: TabAccess;
  fields: FieldAccess;
}

/** AccessConfig is a map of role name → RoleAccess, supporting any custom role. */
export type AccessConfig = Record<string, RoleAccess>;

/** Defaults applied when a role has no config, or a key is missing. */
export const DEFAULT_ROLE_ACCESS: RoleAccess = {
  tabs: {
    suppliers: true,
    labour: true,
    more: true,
    subDeliveries: true,
    subMaterials: false,
    subPayments: false,
  },
  fields: { deliveryPricing: true },
};

/** Admin always has full access — never reads from Firestore. */
export const ADMIN_ACCESS: RoleAccess = {
  tabs: {
    suppliers: true,
    labour: true,
    more: true,
    subDeliveries: true,
    subMaterials: true,
    subPayments: true,
  },
  fields: { deliveryPricing: true },
};

/** Default Firestore document — what gets written if nothing exists yet. */
export const DEFAULT_CONFIG: AccessConfig = {
  supervisor: { ...DEFAULT_ROLE_ACCESS },
};
