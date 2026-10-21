"use client";

import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/cn";
import { listCountries } from "../lib/countries";

/** Country code picker (native select under a visible label) plus the number. */
export function PhoneField({
  id,
  country,
  value,
  error,
  onCountry,
  onChange,
  onBlur,
}: {
  id: string;
  country: string;
  value: string;
  error: boolean;
  onCountry: (code: string) => void;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const countries = useMemo(() => listCountries(), []);
  const current = countries.find((c) => c.code === country);
  return (
    <div
      className={cn(
        "flex h-14 w-full items-center rounded-xl border bg-white transition-colors focus-within:border-charcoal",
        error ? "border-signal bg-signal-tint/40" : "border-line-strong",
      )}
    >
      <div className="relative flex h-full shrink-0 items-center gap-1 border-r border-line pl-3.5 pr-3 text-base font-bold">
        <span aria-hidden>
          {country} {current?.dial}
        </span>
        <ChevronDown className="size-4 text-muted" aria-hidden />
        <select
          aria-label="Country code"
          value={country}
          onChange={(e) => onCountry(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.dial})
            </option>
          ))}
        </select>
      </div>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="(555) 123-4567"
        value={value}
        aria-invalid={error || undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="h-full min-w-0 flex-1 rounded-r-xl bg-transparent px-3.5 text-base text-charcoal placeholder:text-placeholder focus:outline-none"
      />
    </div>
  );
}
