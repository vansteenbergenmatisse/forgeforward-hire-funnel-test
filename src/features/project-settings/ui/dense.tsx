"use client";

import { useId, type ComponentProps, type ReactNode, type SelectHTMLAttributes } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { controlClass } from "@/components/forms";
import { cn } from "@/shared/cn";

type FieldProps = { label: string; hint?: ReactNode; error?: string; optional?: boolean; className?: string };

/** Laptop-density field shell: 14px bold label, hint or error below. The shared Field is sized for phones. */
export function FieldShell({ label, htmlFor, hint, error, optional, className, children }: FieldProps & { htmlFor: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[14px] font-bold leading-snug">
        {label}
        {optional && <span className="ml-1.5 text-[13px] font-medium text-subtle">Optional</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="flex items-start gap-1.5 text-[13.5px] font-semibold text-signal-deep">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && <div className="text-[13px] leading-snug text-subtle">{hint}</div>
      )}
    </div>
  );
}

const control = "h-9 text-[14.5px]";

export function DenseInput({ label, hint, error, optional, className, inputClassName, mono, ...rest }: FieldProps & ComponentProps<"input"> & { mono?: boolean; inputClassName?: string }) {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id} hint={hint} error={error} optional={optional} className={className}>
      <input id={id} aria-invalid={error ? true : undefined} className={cn(controlClass(!!error), control, mono && "font-mono text-[13.5px]", inputClassName)} {...rest} />
    </FieldShell>
  );
}

export function DenseTextArea({ label, hint, error, optional, className, rows = 3, ...rest }: FieldProps & ComponentProps<"textarea">) {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id} hint={hint} error={error} optional={optional} className={className}>
      <textarea id={id} rows={rows} aria-invalid={error ? true : undefined} className={cn(controlClass(!!error), "py-2 text-[14.5px] leading-snug")} {...rest} />
    </FieldShell>
  );
}

export function DenseSelect({ label, hint, error, optional, className, children, ...rest }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id} hint={hint} error={error} optional={optional} className={className}>
      <div className="relative">
        <select id={id} aria-invalid={error ? true : undefined} className={cn(controlClass(!!error), control, "appearance-none pr-10")} {...rest}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      </div>
    </FieldShell>
  );
}

/** Native checkbox exposed as a switch. Its meaning is always spelled out by the row text next to it. */
export function Toggle({ checked, onChange, label, labelledBy, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; labelledBy?: string; disabled?: boolean }) {
  return (
    <label className={cn("relative inline-flex h-6 w-[42px] shrink-0 items-center", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        aria-labelledby={labelledBy}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="absolute inset-0 rounded-full bg-line-strong transition-colors peer-checked:bg-charcoal peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-charcoal" />
      <span className="absolute left-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-[18px]" />
    </label>
  );
}

/** Title and explanation on the left, a control on the right. */
export function SettingRow({ id, title, description, control, border = true }: { id: string; title: string; description?: ReactNode; control: ReactNode; border?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-6 py-3", border && "border-t border-line first:border-t-0")}>
      <div>
        <p id={id} className="text-[14.5px] font-bold leading-snug">
          {title}
        </p>
        {description && <p className="mt-0.5 text-[13px] leading-snug text-muted">{description}</p>}
      </div>
      {control}
    </div>
  );
}
