import { createBrowserRouter, Navigate, useParams } from "react-router-dom";
import { RequireAuth, RequireRole, RoleHome } from "@/app/guards";
import { AppLayout } from "@/components/layout/AppLayout";
import { RecordsLayout } from "@/components/layout/RecordsLayout";
import { LabourLayout } from "@/components/layout/LabourLayout";
import LoginPage from "@/pages/LoginPage";
import PendingPage from "@/pages/PendingPage";
import BlockedPage from "@/pages/BlockedPage";
import DeliveriesPage from "@/pages/DeliveriesPage";
import AddDeliveryPage from "@/pages/AddDeliveryPage";
import AttendancePage from "@/pages/labour/AttendancePage";
import AddAttendancePage from "@/pages/labour/AddAttendancePage";
import HumanResourcesPage from "@/pages/labour/HumanResourcesPage";
import LabourPaymentsPage from "@/pages/labour/LabourPaymentsPage";
import MorePage from "@/pages/MorePage";
import DashboardPage from "@/pages/admin/DashboardPage";
import SuppliersPage from "@/pages/admin/SuppliersPage";
import SupplierDetailPage from "@/pages/admin/SupplierDetailPage";
import PaymentsPage from "@/pages/admin/PaymentsPage";
import ReportsPage from "@/pages/admin/ReportsPage";
import UsersPage from "@/pages/admin/UsersPage";
import MaterialsPage from "@/pages/admin/MaterialsPage";
import AccessControlPage from "@/pages/admin/AccessControlPage";

/** Redirect /suppliers/:id → /records/suppliers/:id preserving the param. */
function RedirectSupplierDetail() {
  const { id } = useParams();
  return <Navigate to={`/records/suppliers/${id}`} replace />;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/blocked", element: <BlockedPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: "/pending", element: <PendingPage /> },
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <RoleHome /> },

          // ── Backward-compat redirects (old bookmarks / deep links) ──────────
          { path: "/deliveries", element: <Navigate to="/records/deliveries" replace /> },
          { path: "/deliveries/new", element: <Navigate to="/records/deliveries/new" replace /> },
          { path: "/suppliers", element: <Navigate to="/records/suppliers" replace /> },
          { path: "/suppliers/:id", element: <RedirectSupplierDetail /> },
          { path: "/materials", element: <Navigate to="/records/materials" replace /> },
          { path: "/payments", element: <Navigate to="/records/payments" replace /> },

          // ── Records group (Deliveries · Suppliers · Materials · Payments) ───
          {
            path: "/records",
            element: <RecordsLayout />,
            children: [
              { index: true, element: <Navigate to="deliveries" replace /> },
              {
                // Any active non-pending role can access deliveries, materials, payments.
                // Firestore rules + access config enforce what data is actually readable.
                element: <RequireRole allow={["*"]} />,
                children: [
                  { path: "deliveries", element: <DeliveriesPage /> },
                  { path: "deliveries/new", element: <AddDeliveryPage /> },
                  { path: "materials", element: <MaterialsPage /> },
                  { path: "payments", element: <PaymentsPage /> },
                ],
              },
              {
                // Supplier management stays admin-only
                element: <RequireRole allow={["admin"]} />,
                children: [
                  { path: "suppliers", element: <SuppliersPage /> },
                  { path: "suppliers/:id", element: <SupplierDetailPage /> },
                ],
              },
            ],
          },

          // ── Admin standalone ─────────────────────────────────────────────────
          {
            element: <RequireRole allow={["admin"]} />,
            children: [
              { path: "/dashboard", element: <DashboardPage /> },
              { path: "/reports", element: <ReportsPage /> },
              { path: "/users", element: <UsersPage /> },
              { path: "/access-control", element: <AccessControlPage /> },
            ],
          },

          // ── Labour module ────────────────────────────────────────────────────
          {
            element: <RequireRole allow={["*"]} />,
            children: [
              {
                path: "/labour",
                element: <LabourLayout />,
                children: [
                  { index: true, element: <Navigate to="attendance" replace /> },
                  { path: "attendance", element: <AttendancePage /> },
                  { path: "attendance/new", element: <AddAttendancePage /> },
                  { path: "workers", element: <HumanResourcesPage /> },
                  { path: "payments", element: <LabourPaymentsPage /> },
                ],
              },
              { path: "/more", element: <MorePage /> },
            ],
          },
        ],
      },
    ],
  },
]);
