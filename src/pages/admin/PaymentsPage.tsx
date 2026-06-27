import { Wallet } from "lucide-react";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export default function PaymentsPage() {
  return (
    <PagePlaceholder
      icon={Wallet}
      title="Payments"
      description="Recording payments (Given) to suppliers comes in Phase 2."
    />
  );
}
