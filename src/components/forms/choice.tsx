import { Check } from "lucide-react";
import { cn } from "@/shared/cn";

/** Big radio card, 48px+ tap target. Selected state is red outline + tint, plus a filled dot (never color alone). */
export function RadioCard({
  name,
  value,
  label,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-14 cursor-pointer items-center gap-3.5 rounded-xl border-[1.5px] px-4 text-base font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-charcoal",
        checked ? "border-signal bg-signal-tint" : "border-line-strong bg-white hover:bg-sand",
      )}
    >
      <input type="radio" className="sr-only" name={name} value={value} checked={checked} onChange={() => onChange(value)} />
      <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2", checked ? "border-signal" : "border-line-strong")}>
        {checked && <span className="size-3 rounded-full bg-signal" />}
      </span>
      {label}
    </label>
  );
}

/** Two or three options in one row, e.g. Yes / No. */
export function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
  label,
}: {
  name: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl border border-line-strong bg-white p-1">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <label
            key={o.value}
            className={cn(
              "flex h-12 flex-1 cursor-pointer items-center justify-center rounded-lg text-base font-bold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-charcoal",
              on ? "bg-charcoal text-white" : "text-charcoal hover:bg-sand",
            )}
          >
            <input type="radio" className="sr-only" name={name} value={o.value} checked={on} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  children,
  error,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-charcoal">
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-lg border-2 transition-colors",
          checked ? "border-charcoal bg-charcoal text-white" : error ? "border-signal bg-white" : "border-line-strong bg-white",
        )}
      >
        {checked && <Check className="size-4" strokeWidth={3} aria-hidden />}
      </span>
      <span className="text-[15px] leading-snug text-muted">{children}</span>
    </label>
  );
}
