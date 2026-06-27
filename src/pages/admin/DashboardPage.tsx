import { LayoutDashboard } from "lucide-react";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function DashboardPage() {
  return (
    <PagePlaceholder
      icon={LayoutDashboard}
      title="Dashboard"
      description="Total spend and outstanding balances will appear here in Phase 2."
    />
  );
}
