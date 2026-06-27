# Construction Firm Ledger — flux-1b85e

**Date:** 2026-06-27
**Status:** Approved (design)

## Problem

A construction firm owner currently keeps supplier & material records in paper
books / Excel. He wants a robust, user-friendly, **mobile-first** web app to
reduce that burden. The firm has an **owner (admin)** and a few **supervisors**.

- **Supervisors** record the physical facts: supplier name, material type, unit,
  quantity. They must **never see money** (prices, amounts, balances).
- **Admin (owner)** sees and edits everything monetary: prices, amounts paid
  ("Given"), outstanding balance, payments, and reports.

The paper ledger columns observed: Name, Amount, Given, Balance, Material, Unit,
Price, Quantity, Total Amount. ("Amount/Given/Balance" = a running supplier
account; the rest = individual material deliveries.)

It must not feel clumsy to someone used to Excel.

## Stack

- **Vite + React + TypeScript**, **Tailwind + shadcn/ui** (New York theme),
  mobile-first.
- **Firebase**: Authentication (email/password) + **Cloud Firestore** +
  **Hosting** on the free **Spark** plan. No Cloud Functions.
- Static build (`dist/`) deployed from local with `npm run deploy`.
- **Currency: Indian Rupees (₹)**, formatted with Indian grouping via
  `Intl.NumberFormat('en-IN')` (e.g. ₹1,00,000).

## Core principle: money is invisible to supervisors at the data layer

Financial data lives in **admin-only collections**. Firestore Security Rules
deny supervisor read access, so money never reaches a supervisor's device — not
merely hidden in the UI.

## Data model (Firestore)

| Collection | Fields | Read | Write |
|---|---|---|---|
| `users/{uid}` | name, email, role (`admin` / `supervisor` / `pending`) | self + admin | admin; own doc auto-created as `pending` on first login |
| `suppliers/{id}` | name (required), plus optional admin-editable details: phone, address, gstNumber, notes | both roles | supervisor + admin create (name only, on the fly); admin updates details |
| `materials/{id}` | name, unit (e.g. kg, Nos) | both roles | supervisor + admin |
| `deliveries/{id}` | supplierId, supplierName, materialId, materialName, unit, quantity, date, createdBy, createdAt | both roles | supervisor + admin create |
| `deliveryFinancials/{deliveryId}` | price, lineTotal (= price × quantity) | **admin only** | **admin only** |
| `payments/{id}` | supplierId, amount, date, note, createdBy | **admin only** | **admin only** |

- Supplier **Balance** = Σ(lineTotal across that supplier's deliveries) −
  Σ(payments to that supplier). Computed client-side on the admin's device.
- A delivery has no money until the admin sets its price (which creates the
  matching `deliveryFinancials/{deliveryId}` doc).
- Suppliers and materials are created on the fly during delivery entry (name
  only); the admin can enrich supplier details later.

## Security rules (intent)

- Helper: `role()` = `get(/users/$(uid)).data.role`.
- `users`: read own doc always; admin reads all; only admin writes others.
  A user may create their own doc only with `role == 'pending'`.
- `suppliers`, `materials`: read if signed-in with role in {admin, supervisor};
  create if {admin, supervisor}; update suppliers only if admin (details).
- `deliveries`: read/create if {admin, supervisor}.
- `deliveryFinancials`, `payments`: read/write only if `role() == 'admin'`.

## Roles & screens

**Auth gate:** signed-out → Login. Signed-in but `pending` → "waiting for
access" screen. Role determines the app shell shown.

**Supervisor** (no money anywhere):
- Add Delivery: pick or create supplier, pick or create material + unit, enter
  quantity, date (defaults to today). Large tap targets, dropdowns with recent
  items, minimal typing.
- Delivery list (recent entries).

**Admin (owner):**
- Dashboard: total spend, total outstanding balance, quick stats.
- Suppliers: list with Amount / Given / Balance; detail view (deliveries +
  payments); edit supplier details.
- Deliveries: see all; set/edit price per delivery → creates line total.
- Payments: record a payment ("Given") to a supplier.
- Reports: period selector — day / week / bi-monthly / monthly / custom range —
  showing all of: total purchases/spend (with trend), breakdown by supplier,
  breakdown by material, payments & outstanding balances. Plus a chart and
  **Excel/CSV export**.
- Users: promote a `pending` user to admin or supervisor.

## User provisioning (Spark-friendly)

- Owner creates the handful of accounts in the Firebase Console.
- On first login the app writes `users/{uid}` with role `pending`; admin
  promotes them via the Users screen.
- **Bootstrap:** manually set the owner's `users/{uid}.role = "admin"` once in
  the console to seed the first admin.

## Mobile-first / anti-clumsy

Bottom navigation, large touch targets, INR-formatted numbers everywhere,
today-as-default dates, reuse of recent suppliers/materials, and Excel/CSV
export so it stays familiar to a spreadsheet user.

## Trade-offs accepted

- Balances and reports aggregated client-side on the admin device — fine for a
  small firm's data volume; revisit aggregation if it grows very large.
- No Cloud Functions (Spark) → roles assigned via the in-app Users screen, not
  automatically.
- Tailwind via a proper Vite build (not Play CDN) for production quality.

## Implementation phasing

1. **Phase 1** — Project setup (Vite/React/Tailwind/shadcn/Firebase), auth +
   roles + pending gate, suppliers/materials, supervisor delivery entry.
2. **Phase 2** — Admin: pricing per delivery, payments, supplier balances,
   dashboard, supplier detail/edit.
3. **Phase 3** — Reports (period filters, 4 breakdowns, chart) + Excel/CSV
   export. Polish, security-rules hardening, deploy.

## Out of scope (for now)

- Cloud Functions / server-side aggregation.
- Multi-firm / multi-tenant support.
- Invoicing, GST returns, inventory stock levels.
