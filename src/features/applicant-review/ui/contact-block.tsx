import type { ApplicantView } from "@/features/applicants";
import { localTime } from "@/features/applicants";
import { CopyButton } from "./copy-button";
import { Section } from "./section";

function Row({ label, value, copy, copyValue }: { label: string; value: string; copy?: boolean; copyValue?: string }) {
  return (
    <div className="flex min-h-10 items-center gap-3 py-1">
      <dt className="w-24 shrink-0 text-sm text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-sm font-semibold text-charcoal">{value}</dd>
      {copy && <CopyButton value={copyValue ?? value} label={label.toLowerCase()} />}
    </div>
  );
}

export function ContactBlock({ a }: { a: ApplicantView }) {
  const local = localTime(a.timezone);
  return (
    <Section title="Contact">
      <dl className="divide-y divide-line">
        <Row label="Email" value={a.email} copy />
        <Row label="Phone" value={a.phoneE164} copy />
        <Row label="WhatsApp" value={a.whatsappOk ? "Yes" : "No"} />
        <Row label="Time zone" value={local ? `${a.timezone} · ${local}` : a.timezone} copyValue={a.timezone} copy />
      </dl>
    </Section>
  );
}
