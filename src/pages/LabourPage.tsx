import { HardHat } from "lucide-react";

export default function LabourPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <HardHat className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <p className="text-base font-semibold">Labour Attendance</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Track daily worker attendance, wages, and overtime. Coming soon.
        </p>
      </div>
    </div>
  );
}
