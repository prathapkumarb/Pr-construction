import { formatInr } from "@/lib/format";

interface Props {
  data: { label: string; value: number }[];
}

/** Minimal dependency-free vertical bar chart for spend trends. */
export function BarChart({ data }: Props) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const hasValues = data.some((d) => d.value > 0);

  if (!hasValues) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No purchases in this period.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex h-40 min-w-full items-end gap-1 px-1" style={{ minWidth: data.length * 18 }}>
        {data.map((d, i) => (
          <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-1">
            <div className="relative w-full">
              <div
                className="mx-auto w-full rounded-t bg-primary/80 transition-all group-hover:bg-primary"
                style={{ height: `${(d.value / max) * 140}px` }}
                title={`${d.label}: ${formatInr(d.value)}`}
              />
            </div>
            <span className="max-w-full truncate text-[9px] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
