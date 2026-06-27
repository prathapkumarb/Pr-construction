import { Link } from "react-router-dom";
import { IndianRupee, Wallet, Users, AlertCircle, ArrowRight } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { formatInr } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function Stat({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className={tone === "warn" ? "h-4 w-4 text-amber-600" : "h-4 w-4"} />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { totals, loading } = useLedger();

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Overview</h1>

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={IndianRupee} label="Total purchases" value={formatInr(totals.totalSpend)} />
        <Stat icon={Wallet} label="Paid (given)" value={formatInr(totals.totalGiven)} />
        <Stat icon={AlertCircle} label="Outstanding" value={formatInr(totals.totalOutstanding)} tone="warn" />
        <Stat icon={Users} label="Suppliers" value={String(totals.supplierCount)} />
      </div>

      {totals.unpricedCount > 0 && (
        <Link to="/deliveries">
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {totals.unpricedCount} deliver{totals.unpricedCount === 1 ? "y" : "ies"} need a price
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-700" />
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link to="/suppliers">
          <Card className="transition-colors hover:bg-accent">
            <CardContent className="flex items-center justify-between p-4">
              <span className="font-medium">View suppliers &amp; balances</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/payments">
          <Card className="transition-colors hover:bg-accent">
            <CardContent className="flex items-center justify-between p-4">
              <span className="font-medium">Record a payment</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
