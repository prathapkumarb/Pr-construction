import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import type { Material } from "@/lib/types";
import { hasExactMatch } from "@/lib/fuzzy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const COMMON_UNITS = ["kg", "Nos", "bags", "litre", "ton", "box", "ft", "m"];

interface Props {
  materials: Material[];
  value: Material | null;
  onSelect: (material: Material) => void;
  onCreate: (name: string, unit: string) => Promise<void>;
}

export function MaterialPicker({ materials, value, onSelect, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [unit, setUnit] = useState("");
  const [creating, setCreating] = useState(false);

  const trimmed = search.trim();
  const exactExists = useMemo(() => hasExactMatch(trimmed, materials), [trimmed, materials]);
  const canCreate = trimmed.length >= 1 && !exactExists;

  async function handleCreate() {
    if (!unit.trim()) return;
    setCreating(true);
    try {
      await onCreate(trimmed, unit.trim());
      setOpen(false);
      setSearch("");
      setUnit("");
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
          {value ? (
            <span>
              {value.name} <span className="text-muted-foreground">({value.unit})</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select material</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter>
          <CommandInput
            placeholder="Search or type a material…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No material found.</CommandEmpty>
            <CommandGroup>
              {materials.map((m) => (
                <CommandItem
                  key={m.id}
                  value={m.name}
                  onSelect={() => {
                    onSelect(m);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.id === m.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {m.name}
                  <span className="ml-auto text-xs text-muted-foreground">{m.unit}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>

          {canCreate && (
            <div className="space-y-2 border-t p-2">
              <p className="px-1 text-xs font-medium text-muted-foreground">
                Add new material “{trimmed}” — choose a unit:
              </p>
              <div className="flex flex-wrap gap-1.5 px-1">
                {COMMON_UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium",
                      unit === u ? "border-primary bg-primary text-primary-foreground" : "bg-background",
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="h-9"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={creating || !unit.trim()}
                  onClick={handleCreate}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
