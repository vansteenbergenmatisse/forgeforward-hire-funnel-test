/** Two-letter country code from the phone number. Text, never a flag emoji. */
export function CountryChip({ code }: { code: string }) {
  return <span className="inline-flex h-[18px] items-center rounded-xs bg-sand px-[5px] text-[10.5px] font-extrabold tracking-[0.04em] text-muted">{code}</span>;
}
