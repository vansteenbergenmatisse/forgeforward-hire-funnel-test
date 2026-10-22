"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { controlClass } from "@/components/forms";
import { cn } from "@/shared/cn";
import { formatZone, listTimeZones } from "../lib/timezones";

type Option = { zone: string; label: string };

/** Searchable time zone list (combobox). Type to filter, arrows to move, Enter to pick. */
export function TimeZoneSelect({
  id,
  value,
  error,
  onChange,
  onBlur,
}: {
  id: string;
  value: string;
  error: boolean;
  onChange: (zone: string) => void;
  onBlur: () => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const options = useMemo<Option[]>(() => (open ? listTimeZones().map((zone) => ({ zone, label: formatZone(zone) })) : []), [open]);
  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () => (q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.zone.toLowerCase().includes(q)) : options).slice(0, 60),
    [options, q],
  );

  // Keep the highlighted option visible when arrow keys move past the edge of the list.
  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);

  function pick(zone: string) {
    onChange(zone);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && open && shown[active]) {
      e.preventDefault();
      pick(shown[active].zone);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={error || undefined}
        aria-activedescendant={open && shown[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        className={cn(controlClass(error), "h-14 pr-11")}
        value={open ? query : value ? formatZone(value) : ""}
        placeholder={value ? formatZone(value) : "Search your time zone"}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          setOpen(false);
          setQuery("");
          onBlur();
        }}
      />
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Time zones"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line-strong bg-white py-1 shadow-lift"
        >
          {shown.length === 0 && <li className="px-4 py-3 text-sm text-muted">No match. Try a city name.</li>}
          {shown.map((o, i) => (
            <li
              key={o.zone}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o.zone === value}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o.zone);
              }}
              className={cn("flex min-h-12 cursor-pointer items-center px-4 text-base", i === active && "bg-sand", o.zone === value && "font-bold")}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
