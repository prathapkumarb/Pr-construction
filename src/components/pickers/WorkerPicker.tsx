import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, Lightbulb } from "lucide-react";
import type { LabourWorker } from "@/lib/labourTypes";
import { findSimilar, hasExactMatch, normalizeName } from "@/lib/fuzzy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Props {
  workers: LabourWorker[];
  value: LabourWorker | null;
  onSelect: (worker: LabourWorker) => void;
  onCreate: (name: string) => Promise<void>;
}

export function WorkerPicker({ workers, value, onSelect, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const trimmed = search.trim();
  const norm = normalizeName(trimmed);

  const suggestions = useMemo(
    () => findSimilar(trimmed, workers, { threshold: 0.65 }),
    [trimmed, workers],
  );
  const exactExists = useMemo(() => hasExactMatch(trimmed, workers), [trimmed, workers]);
  const canCreate = trimmed.length >= 2 && !exactExists;

  async function handleCreate() {
    setCreating(true);
    try {
      await onCreate(trimmed);
      setOpen(false);
      setSearch("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-11 w-full justify-between font-normal"
        >
          {value ? value.name : <span className="text-muted-foreground">Select worker</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type a name…"
            value={search}
            onValueChange={setSearch}
          />

          {canCreate && suggestions.length > 0 && (
            <div className="border-b bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="flex items-center gap-1.5 font-medium">
                <Lightbulb className="h-3.5 w-3.5" /> Did you mean an existing worker?
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {suggestions.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      onSelect(w);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="rounded-full border border-amber-300 bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent dark:border-amber-800"
                  >
                    {w.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <CommandList>
            <CommandEmpty>{trimmed ? "No worker found." : "No workers yet."}</CommandEmpty>
            <CommandGroup>
              {workers
                .filter((w) => !norm || normalizeName(w.name).includes(norm))
                .map((w) => (
                  <CommandItem
                    key={w.id}
                    value={w.name}
                    onSelect={() => {
                      onSelect(w);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === w.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="min-w-0">
                      <p className="truncate">{w.name}</p>
                      {w.role && (
                        <p className="truncate text-xs text-muted-foreground">{w.role}</p>
                      )}
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>

          {canCreate && (
            <div className="border-t p-1">
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start"
                disabled={creating}
                onClick={handleCreate}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add new worker "{trimmed}"
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
