import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, Lightbulb } from "lucide-react";
import type { Supplier } from "@/lib/types";
import { findSimilar, hasExactMatch } from "@/lib/fuzzy";
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
  suppliers: Supplier[];
  value: Supplier | null;
  onSelect: (supplier: Supplier) => void;
  onCreate: (name: string) => Promise<void>;
}

export function SupplierPicker({ suppliers, value, onSelect, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const trimmed = search.trim();
  const suggestions = useMemo(
    () => findSimilar(trimmed, suppliers, { threshold: 0.65 }),
    [trimmed, suppliers],
  );
  const exactExists = useMemo(() => hasExactMatch(trimmed, suppliers), [trimmed, suppliers]);
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
          {value ? value.name : <span className="text-muted-foreground">Select supplier</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter>
          <CommandInput placeholder="Search or type a name…" value={search} onValueChange={setSearch} />

          {canCreate && suggestions.length > 0 && (
            <div className="border-b bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="flex items-center gap-1.5 font-medium">
                <Lightbulb className="h-3.5 w-3.5" /> Did you mean an existing supplier?
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelect(s);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="rounded-full border border-amber-300 bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent dark:border-amber-800"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <CommandList>
            <CommandEmpty>No supplier found.</CommandEmpty>
            <CommandGroup>
              {suppliers.map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.name}
                  onSelect={() => {
                    onSelect(s);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.id === s.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {s.name}
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
                Add new supplier “{trimmed}”
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
