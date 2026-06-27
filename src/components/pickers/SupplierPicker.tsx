import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, Lightbulb } from "lucide-react";
import type { Supplier } from "@/lib/types";
import { findSimilar, hasExactMatch, normalizeName } from "@/lib/fuzzy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  /** Called when an inactive supplier is picked (admin reactivation flow). */
  onReactivate?: (supplier: Supplier) => Promise<void>;
}

export function SupplierPicker({ suppliers, value, onSelect, onCreate, onReactivate }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.active !== false), [suppliers]);
  const inactiveSuppliers = useMemo(() => suppliers.filter((s) => s.active === false), [suppliers]);

  const trimmed = search.trim();
  const norm = normalizeName(trimmed);

  const suggestions = useMemo(
    () => findSimilar(trimmed, activeSuppliers, { threshold: 0.65 }),
    [trimmed, activeSuppliers],
  );
  const exactExists = useMemo(() => hasExactMatch(trimmed, suppliers), [trimmed, suppliers]);
  const canCreate = trimmed.length >= 2 && !exactExists;

  // When searching, show matching inactive suppliers too
  const matchingInactive = useMemo(() => {
    if (!norm) return [];
    return inactiveSuppliers.filter((s) => normalizeName(s.name).includes(norm));
  }, [norm, inactiveSuppliers]);

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

  async function handleReactivate(s: Supplier) {
    if (onReactivate) await onReactivate(s);
    else onSelect(s);
    setOpen(false);
    setSearch("");
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
        <Command shouldFilter={false}>
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
            <CommandEmpty>{trimmed ? "No active supplier found." : "No suppliers yet."}</CommandEmpty>
            <CommandGroup>
              {activeSuppliers
                .filter((s) => !norm || normalizeName(s.name).includes(norm))
                .map((s) => (
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

            {matchingInactive.length > 0 && onReactivate && (
              <CommandGroup heading="Inactive — tap to reactivate">
                {matchingInactive.map((s) => (
                  <CommandItem
                    key={s.id}
                    value={`inactive-${s.id}`}
                    onSelect={() => handleReactivate(s)}
                    className="opacity-60"
                  >
                    <Check className="mr-2 h-4 w-4 opacity-0" />
                    {s.name}
                    <Badge variant="outline" className="ml-auto text-[10px]">inactive</Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
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
                Add new supplier "{trimmed}"
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
