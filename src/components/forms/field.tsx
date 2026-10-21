import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/shared/cn";

const control =
  "w-full rounded-xl border bg-white px-4 text-base text-charcoal placeholder:text-placeholder transition-colors focus:border-charcoal focus:outline-none";

export function controlClass(error?: boolean) {
  return cn(control, error ? "border-signal bg-signal-tint/40" : "border-line-strong");
}

/** Label above, hint or error below. Labels stay visible after typing. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="text-base font-bold leading-snug text-charcoal">
        {label}
        {optional && <span className="ml-1.5 text-sm font-medium text-subtle">Optional</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="flex items-start gap-1.5 text-sm font-semibold text-signal-deep">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && <p className="text-sm leading-snug text-subtle">{hint}</p>
      )}
    </div>
  );
}

export function TextInput({ error, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return <input aria-invalid={error || undefined} className={cn(controlClass(error), "h-14", className)} {...rest} />;
}

export function TextArea({ error, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return <textarea aria-invalid={error || undefined} className={cn(controlClass(error), "min-h-32 py-3.5", className)} {...rest} />;
}

export function Select({ error, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <div className="relative">
      <select aria-invalid={error || undefined} className={cn(controlClass(error), "h-14 appearance-none pr-11", className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
}
