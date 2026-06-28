import { createBrowserRouter } from "react-router-dom";
import { RequireAuth, RequireRole, RoleHome } from "@/app/guards";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
import PendingPage from "@/pages/PendingPage";
import BlockedPage from "@/pages/BlockedPage";
import DeliveriesPage from "@/pages/DeliveriesPage";
import AddDeliveryPage from "@/pages/AddDeliveryPage";
import DashboardPage from "@/pages/admin/DashboardPage";
import SuppliersPage from "@/pages/admin/SuppliersPage";
import SupplierDetailPage from "@/pages/admin/SupplierDetailPage";
import PaymentsPage from "@/pages/admin/PaymentsPage";
import ReportsPage from "@/pages/admin/ReportsPage";
import UsersPage from "@/pages/admin/UsersPage";
import MaterialsPage from "@/pages/admin/MaterialsPage";

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
          {
            element: <RequireRole allow={["admin", "supervisor"]} />,
            children: [
              { path: "/deliveries", element: <DeliveriesPage /> },
              { path: "/deliveries/new", element: <AddDeliveryPage /> },
            ],
          },
          {
            element: <RequireRole allow={["admin"]} />,
            children: [
              { path: "/dashboard", element: <DashboardPage /> },
              { path: "/suppliers", element: <SuppliersPage /> },
              { path: "/suppliers/:id", element: <SupplierDetailPage /> },
              { path: "/payments", element: <PaymentsPage /> },
              { path: "/reports", element: <ReportsPage /> },
              { path: "/users", element: <UsersPage /> },
              { path: "/materials", element: <MaterialsPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
