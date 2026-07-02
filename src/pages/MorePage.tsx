import { Wrench, ShieldCheck, Crown, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const comingSoon = [
  {
    icon: Wrench,
    title: "Contractor Management",
    description:
      "Manage plumbers, electricians, painters, and other contractors. Track work orders and payments.",
  },
  {
    icon: Crown,
    title: "Owner Management",
    description:
      "Owner-level dashboard with full financial overview and multi-site reports.",
  },
];

export default function MorePage() {
  const { role } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">More</h1>

      {/* Admin-only: functional items */}
      {role === "admin" && (
        <Card
          className="cursor-pointer transition-colors hover:bg-accent"
          onClick={() => navigate("/access-control")}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <ShieldCheck className="h-4 w-4 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">Access Control</p>
              <p className="text-sm text-muted-foreground">
                Configure tabs and data access per role
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {/* Coming soon items */}
      <div className="space-y-3">
        {comingSoon.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="opacity-70">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{title}</p>
                  <Badge variant="outline" className="text-[10px]">
                    Coming soon
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
