"use client";

import { AlertCircle, ArrowRight, Clock } from "lucide-react";
import type { ReactNode } from "react";
import { Checkbox, Field, Segmented, TextInput } from "@/components/forms";
import { MainButton, StepBody, StepFooter } from "@/components/funnel";
import { activeQuestions, questionKey, errorSummary, type FormValues } from "../lib/form-validation";
import { CONSENT_TEXT } from "../schemas";
import type { FunnelApi, FunnelProject, FunnelSession } from "../types";
import { PhoneField } from "./phone-field";
import { QuestionField } from "./question-field";
import { TimeZoneSelect } from "./timezone-select";
import { useDetailsForm } from "./use-details-form";

function Wrap({ name, children }: { name: string; children: ReactNode }) {
  return <div data-field={name}>{children}</div>;
}

export function DetailsForm({
  project,
  api,
  tracking,
  inAppBrowser,
  initial,
  showErrorsOnMount,
  onDone,
}: {
  project: FunnelProject;
  api: FunnelApi;
  tracking: Record<string, string>;
  inAppBrowser: boolean;
  initial: FormValues;
  showErrorsOnMount?: boolean;
  onDone: (session: FunnelSession, firstName: string) => void;
}) {
  const f = useDetailsForm({
    slug: project.slug,
    questions: project.questions,
    api,
    tracking,
    inAppBrowser,
    initial,
    showErrorsOnMount,
    onDone,
  });
  const { values: v, errors: e } = f;

  return (
    <form
      noValidate
      className="flex flex-1 flex-col md:flex-none"
      onSubmit={(ev) => {
        ev.preventDefault();
        void f.submit();
      }}
    >
      <StepBody>
        {f.summary > 0 && Object.keys(e).length > 0 && (
          <div role="alert" className="mb-[18px] flex items-start gap-2.5 rounded-xl bg-signal-tint px-3.5 py-3 text-[14.5px] font-semibold leading-snug text-signal-deep">
            <AlertCircle className="mt-0.5 size-[18px] shrink-0" aria-hidden />
            <span>{errorSummary(Object.keys(e).length)}</span>
          </div>
        )}

        <Intro project={project} />

        <h2 className="mb-3.5 text-[22px] leading-none text-charcoal">Your details</h2>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Wrap name="firstName">
              <Field label="First name" htmlFor="f-firstName" error={e.firstName}>
                <TextInput id="f-firstName" autoComplete="given-name" placeholder="Sam" value={v.firstName} error={!!e.firstName} onChange={(ev) => f.update({ firstName: ev.target.value }, "firstName")} onBlur={() => f.blur("firstName")} />
              </Field>
            </Wrap>
            <Wrap name="lastName">
              <Field label="Last name" htmlFor="f-lastName" error={e.lastName}>
                <TextInput id="f-lastName" autoComplete="family-name" placeholder="Rivera" value={v.lastName} error={!!e.lastName} onChange={(ev) => f.update({ lastName: ev.target.value }, "lastName")} onBlur={() => f.blur("lastName")} />
              </Field>
            </Wrap>
          </div>
          <Wrap name="email">
            <Field label="Email" htmlFor="f-email" error={e.email}>
              <TextInput id="f-email" type="email" autoComplete="email" placeholder="you@email.com" value={v.email} error={!!e.email} onChange={(ev) => f.update({ email: ev.target.value }, "email")} onBlur={() => f.blur("email")} />
            </Field>
          </Wrap>
          <Wrap name="phone">
            <Field label="Phone" htmlFor="f-phone" error={e.phone}>
              <PhoneField id="f-phone" country={v.country} value={v.phone} error={!!e.phone} onCountry={(country) => f.update({ country }, "phone")} onChange={(phone) => f.update({ phone }, "phone")} onBlur={() => f.blur("phone")} />
            </Field>
          </Wrap>
          <Wrap name="whatsappOk">
            <Field label="Can we contact you on WhatsApp?" error={e.whatsappOk}>
              <Segmented
                name="whatsappOk"
                label="Can we contact you on WhatsApp?"
                value={v.whatsappOk === null ? null : v.whatsappOk ? "yes" : "no"}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                onChange={(val) => f.update({ whatsappOk: val === "yes" }, "whatsappOk")}
              />
            </Field>
          </Wrap>
          <Wrap name="timezone">
            <Field label="Your time zone" htmlFor="f-timezone" error={e.timezone} hint="We filled this in from your device. Change it if it is wrong.">
              <TimeZoneSelect id="f-timezone" value={v.timezone} error={!!e.timezone} onChange={(timezone) => f.update({ timezone }, "timezone")} onBlur={() => f.blur("timezone")} />
            </Field>
          </Wrap>

          {activeQuestions(project.questions).map((q) => (
            <Wrap key={q.id} name={questionKey(q.id)}>
              <QuestionField q={q} id={`f-${questionKey(q.id)}`} value={v.answers[q.id]} error={e[questionKey(q.id)]} onChange={(val) => f.setAnswer(q.id, val)} onBlur={() => f.blur(questionKey(q.id))} />
            </Wrap>
          ))}

          <Wrap name="consent">
            <Checkbox checked={v.consent} error={!!e.consent} onChange={(consent) => f.update({ consent }, "consent")}>
              {CONSENT_TEXT}
            </Checkbox>
            {e.consent && (
              <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-signal-deep">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {e.consent}
              </p>
            )}
          </Wrap>

          {/* Honeypot: people never see or fill this. The name is not a real field name, so autofill skips it. */}
          <div aria-hidden inert className="absolute -left-[9999px] top-auto size-px overflow-hidden">
            <label>
              Leave this empty
              <input type="text" name="hp_note_9x" tabIndex={-1} autoComplete="off" data-lpignore="true" data-1p-ignore data-form-type="other" value={f.website} onChange={(ev) => f.setWebsite(ev.target.value)} />
            </label>
          </div>
        </div>
      </StepBody>
      <StepFooter>
        {f.submitError && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-signal-tint px-3.5 py-3 text-[14.5px] font-semibold leading-snug text-signal-deep">
            <AlertCircle className="mt-0.5 size-[18px] shrink-0" aria-hidden />
            {f.submitError}
          </p>
        )}
        <MainButton type="submit" loading={f.submitting}>
          {f.submitting ? "Saving" : "Next: your video"}
          {!f.submitting && <ArrowRight className="size-5" aria-hidden />}
        </MainButton>
      </StepFooter>
    </form>
  );
}

function Intro({ project }: { project: FunnelProject }) {
  return (
    <>
      <div>
        <p className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-signal">Forge Forward is hiring</p>
        <h1 className="mt-2 text-[40px] leading-[0.98] md:text-[52px]">{project.name}</h1>
        {project.intro && <p className="mt-3.5 text-base leading-normal text-muted">{project.intro}</p>}
        <p className="mt-3.5 flex items-center gap-2 text-[14.5px] font-bold">
          <Clock className="size-4 shrink-0" aria-hidden />
          Takes about 5 minutes. You need a camera or a mic.
        </p>
      </div>
      <div className="my-6 h-px bg-line" />
    </>
  );
}

export type { FormValues };
