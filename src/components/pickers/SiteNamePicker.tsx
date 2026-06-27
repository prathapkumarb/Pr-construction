import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import type { Site } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
  sites: Site[];
  value: string;
  onChange: (value: string) => void;
  /** Called when the user types a brand-new site name and confirms it. */
  onCreate: (name: string) => Promise<void>;
  /** Called when the user picks an inactive site (should reactivate it). */
  onReactivate: (site: Site) => Promise<void>;
}

export function SiteNamePicker({ sites, value, onChange, onCreate, onReactivate }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const activeSites = useMemo(() => sites.filter((s) => s.active !== false), [sites]);
  const inactiveSites = useMemo(() => sites.filter((s) => s.active === false), [sites]);

  const trimmed = search.trim();
  const lower = trimmed.toLowerCase();

  const filteredActive = useMemo(
    () => (lower ? activeSites.filter((s) => s.name.toLowerCase().includes(lower)) : activeSites),
    [lower, activeSites],
  );
  const filteredInactive = useMemo(
    () => (lower ? inactiveSites.filter((s) => s.name.toLowerCase().includes(lower)) : []),
    [lower, inactiveSites],
  );

  const isNew =
    trimmed.length > 0 &&
    !sites.some((s) => s.name.toLowerCase() === trimmed.toLowerCase());

  async function handleCreate() {
    setBusy(true);
    try {
      await onCreate(trimmed);
      onChange(trimmed);
      setSearch("");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleReactivate(site: Site) {
    setBusy(true);
    try {
      await onReactivate(site);
      onChange(site.name);
      setSearch("");
      setOpen(false);
    } finally {
      setBusy(false);
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
            <span>{value}</span>
          ) : (
            <span className="text-muted-foreground">Select or type a site name…</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type a site name…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filteredActive.length === 0 && filteredInactive.length === 0 && !isNew && (
              <CommandEmpty>No sites recorded yet.</CommandEmpty>
            )}

            {filteredActive.length > 0 && (
              <CommandGroup>
                {filteredActive.map((s) => (
                  <CommandItem
                    key={s.id}
                    value={s.name}
                    onSelect={() => {
                      onChange(s.name);
                      setSearch("");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", value === s.name ? "opacity-100" : "opacity-0")}
                    />
                    {s.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredInactive.length > 0 && (
              <CommandGroup heading="Inactive — tap to reactivate">
                {filteredInactive.map((s) => (
                  <CommandItem
                    key={s.id}
                    value={`inactive-${s.id}`}
                    disabled={busy}
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

            {isNew && (
              <CommandGroup>
                <CommandItem
                  value={`new-${trimmed}`}
                  disabled={busy}
                  onSelect={handleCreate}
                >
                  <span className="text-muted-foreground mr-2 text-sm">New site:</span>
                  &ldquo;{trimmed}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
