import { CalendarCheck } from "lucide-react";
import { Badge } from "@/components/ui";
import type { ApplicantView } from "@/features/applicants";
import { formatStamp } from "../lib/format";
import { Section } from "./section";

export function BookingBlock({ a }: { a: ApplicantView }) {
  if (!a.booking) return null;
  const b = a.booking;
  const end = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(b.end));
  return (
    <Section title="Interview booking" aside={b.status === "cancelled" ? <Badge tone="red">Cancelled</Badge> : b.status === "rescheduled" ? <Badge tone="amber">Rescheduled</Badge> : <Badge tone="green">Booked</Badge>}>
      <p className="flex items-center gap-2 text-sm font-semibold text-charcoal">
        <CalendarCheck className="size-4 text-muted" aria-hidden />
        <span className={b.status === "cancelled" ? "line-through" : undefined}>{formatStamp(b.start)} to {end}</span>
      </p>
    </Section>
  );
}
