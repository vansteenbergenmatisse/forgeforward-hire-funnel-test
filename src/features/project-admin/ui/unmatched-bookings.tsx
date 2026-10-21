"use client";

import { useId, useRef, useState } from "react";
import { CalendarClock, Link2, X } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { Field, Select } from "@/components/forms";
import type { ApplicantView } from "@/features/applicants";
import type { UnmatchedBooking } from "../types";
import { ModalDialog } from "./modal-dialog";

type Props = {
  bookings: UnmatchedBooking[];
  applicants: ApplicantView[];
  onLink: (bookingId: string, applicantId: string) => void;
  onDismiss: (bookingId: string) => void;
};

export function UnmatchedBookings({ bookings, applicants, onLink, onDismiss }: Props) {
  const open = bookings.filter((b) => !b.dismissed && !b.linkedApplicantId);
  const linked = bookings.filter((b) => b.linkedApplicantId);
  const [picking, setPicking] = useState<UnmatchedBooking | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [notice, setNotice] = useState("");

  if (open.length === 0 && !notice && linked.length === 0) return null;

  return (
    <section aria-labelledby="unmatched-title" className="rounded-[14px] border border-line bg-white px-5 py-[18px]">
      <div className="flex items-center justify-between">
        <h2 id="unmatched-title" className="font-sans! text-[15px] font-extrabold normal-case! tracking-normal!">
          Unmatched bookings
        </h2>
        <Badge tone="amber">{open.length}</Badge>
      </div>
      <p className="mb-3 mt-1 text-[13px] text-muted">Cal.com sent a booking we could not match to an applicant.</p>
      <p role="status" className={notice ? "mb-3 rounded-lg bg-ok-tint px-3 py-2 text-[13px] font-semibold text-ok" : "sr-only"}>
        {notice}
      </p>
      {open.length === 0 && <p className="text-sm text-muted">Nothing to match right now.</p>}
      <ul className="flex flex-col gap-2">
        {open.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-[10px] bg-ivory p-3">
            <CalendarClock className="size-[18px] shrink-0 text-amber" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{b.email}</p>
              <p className="mt-0.5 text-[12.5px] text-muted">
                {b.title} · {b.when}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Link2 className="size-4" aria-hidden />}
              onClick={(e) => {
                triggerRef.current = e.currentTarget;
                setPicking(b);
              }}
            >
              Link to applicant
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<X className="size-4" aria-hidden />}
              onClick={() => {
                onDismiss(b.id);
                setNotice(`Dismissed the booking from ${b.email}.`);
              }}
            >
              Dismiss
            </Button>
          </li>
        ))}
      </ul>
      <ModalDialog open={picking !== null} onClose={() => setPicking(null)} title="Link booking" titleId="link-booking-title" returnFocusRef={triggerRef}>
        {picking && (
          <LinkForm
            booking={picking}
            applicants={applicants}
            onCancel={() => setPicking(null)}
            onConfirm={(applicantId, label) => {
              onLink(picking.id, applicantId);
              setNotice(`Linked ${picking.email} to ${label}.`);
              setPicking(null);
            }}
          />
        )}
      </ModalDialog>
    </section>
  );
}

function LinkForm({
  booking,
  applicants,
  onCancel,
  onConfirm,
}: {
  booking: UnmatchedBooking;
  applicants: ApplicantView[];
  onCancel: () => void;
  onConfirm: (applicantId: string, label: string) => void;
}) {
  const uid = useId();
  const sorted = [...applicants].filter((a) => !a.isTest).sort((a, b) => a.firstName.localeCompare(b.firstName));
  const [id, setId] = useState("");
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const a = sorted.find((x) => x.id === id);
        if (a) onConfirm(a.id, `${a.firstName} ${a.lastName}`);
      }}
    >
      <p className="text-sm text-muted">
        {booking.email} booked {booking.title.toLowerCase()} for {booking.when}. Pick the applicant it belongs to.
      </p>
      <Field label="Applicant" htmlFor={`${uid}-ap`}>
        <Select id={`${uid}-ap`} value={id} onChange={(e) => setId(e.target.value)} className="h-11! rounded-[9px]! text-sm!">
          <option value="">Choose an applicant</option>
          {sorted.map((a) => (
            <option key={a.id} value={a.id}>
              {a.firstName} {a.lastName} · {a.email}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!id}>
          Link booking
        </Button>
      </div>
    </form>
  );
}
