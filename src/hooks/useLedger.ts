import { useMemo } from "react";
import { useCollectionData } from "@/hooks/useCollectionData";
import type { Delivery, DeliveryFinancial, Payment, Supplier } from "@/lib/types";
import { suppliersQuery } from "@/services/suppliers";
import { deliveriesQuery } from "@/services/deliveries";
import { paymentsQuery } from "@/services/payments";
import { financialsQuery } from "@/services/financials";
import {
  computeSupplierTotals,
  computeLedgerTotals,
  type SupplierTotals,
  type LedgerTotals,
} from "@/lib/ledger";

interface LedgerData {
  suppliers: Supplier[];
  deliveries: Delivery[];
  financials: DeliveryFinancial[];
  payments: Payment[];
  perSupplier: SupplierTotals[];
  totals: LedgerTotals;
  financialsById: Map<string, DeliveryFinancial>;
  loading: boolean;
}

/** Admin-only: subscribes to all ledger collections and computes balances. */
export function useLedger(): LedgerData {
  const sQ = useMemo(() => suppliersQuery(), []);
  const dQ = useMemo(() => deliveriesQuery(), []);
  const pQ = useMemo(() => paymentsQuery(), []);
  const fQ = useMemo(() => financialsQuery(), []);

  const { data: suppliers, loading: ls } = useCollectionData<Supplier>(sQ);
  const { data: deliveries, loading: ld } = useCollectionData<Delivery>(dQ);
  const { data: payments, loading: lp } = useCollectionData<Payment>(pQ);
  const { data: financials, loading: lf } = useCollectionData<DeliveryFinancial>(fQ);

  const perSupplier = useMemo(
    () => computeSupplierTotals(suppliers, deliveries, financials, payments),
    [suppliers, deliveries, financials, payments],
  );
  const totals = useMemo(() => computeLedgerTotals(perSupplier), [perSupplier]);
  const financialsById = useMemo(
    () => new Map(financials.map((f) => [f.id, f])),
    [financials],
  );

  return {
    suppliers,
    deliveries,
    financials,
    payments,
    perSupplier,
    totals,
    financialsById,
    loading: ls || ld || lp || lf,
  };
}
