"use client";

import { useRef, useState } from "react";
import type { QuestionDef } from "@/features/projects";
import { FunnelApiError, NETWORK_MESSAGE, SERVER_MESSAGE } from "../api/errors";
import {
  activeQuestions,
  countErrors,
  fieldOrder,
  firstErrorKey,
  parseNumberAnswer,
  questionKey,
  validateField,
  validateForm,
  type AnswerValue,
  type FormErrors,
  type FormValues,
} from "../lib/form-validation";
import { newIdempotencyKey } from "../lib/idempotency";
import type { FunnelApi, FunnelSession, StartPayload } from "../types";

/** Keeps only server field errors that match a field on screen. */
export function mapServerFields(fields: Record<string, string>, questions: QuestionDef[]): FormErrors {
  const known = new Set(fieldOrder(questions));
  const out: FormErrors = {};
  for (const [k, msg] of Object.entries(fields)) if (known.has(k)) out[k] = msg;
  return out;
}

export type DetailsPreset = { values: FormValues; showErrors: boolean };

type Args = {
  slug: string;
  questions: QuestionDef[];
  api: FunnelApi;
  tracking: Record<string, string>;
  inAppBrowser: boolean;
  initial: FormValues;
  showErrorsOnMount?: boolean;
  onDone: (session: FunnelSession, firstName: string) => void;
};

export function useDetailsForm({ slug, questions, api, tracking, inAppBrowser, initial, showErrorsOnMount, onDone }: Args) {
  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<FormErrors>(() => (showErrorsOnMount ? validateForm(initial, questions) : {}));
  const [summary, setSummary] = useState<number>(() => (showErrorsOnMount ? countErrors(validateForm(initial, questions)) : 0));
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const keyRef = useRef<string | null>(null);
  const busyRef = useRef(false);

  function applyField(key: string, next: FormValues) {
    const msg = validateField(key, next, questions);
    setErrors((e) => {
      const copy = { ...e };
      if (msg) copy[key] = msg;
      else delete copy[key];
      return copy;
    });
  }

  function update(patch: Partial<FormValues>, key?: string) {
    const next = { ...values, ...patch };
    setValues(next);
    if (key && errors[key]) applyField(key, next); // clear a shown error as soon as it is fixed
  }

  function setAnswer(id: string, value: AnswerValue | undefined) {
    const next = { ...values, answers: { ...values.answers, [id]: value } };
    setValues(next);
    const key = questionKey(id);
    if (errors[key]) applyField(key, next);
  }

  const blur = (key: string) => applyField(key, values);

  async function submit() {
    if (busyRef.current) return;
    const found = validateForm(values, questions);
    setErrors(found);
    setSummary(countErrors(found));
    const first = firstErrorKey(found, questions);
    if (first) {
      focusField(first);
      return;
    }
    busyRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    keyRef.current ??= newIdempotencyKey();
    const answers: StartPayload["answers"] = {};
    for (const q of activeQuestions(questions)) {
      const a = values.answers[q.id];
      if (a === undefined || (typeof a === "string" && a.trim() === "") || (Array.isArray(a) && a.length === 0)) continue;
      answers[q.id] = q.type === "number" ? (parseNumberAnswer(a) ?? a) : a;
    }
    try {
      const session = await api.start(
        {
          projectSlug: slug,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim().toLowerCase(),
          phone: values.phone.trim(),
          phoneCountry: values.country,
          whatsappOk: values.whatsappOk === true,
          timezone: values.timezone,
          consent: true,
          answers,
          utm: tracking,
          inAppBrowser,
          website: website || undefined,
        },
        keyRef.current,
      );
      onDone(session, values.firstName.trim());
    } catch (err) {
      if (err instanceof FunnelApiError && err.status !== null && err.status >= 400 && err.status < 500 && err.code !== "in_progress") {
        keyRef.current = null; // the server refused this payload: an edited retry is a new request
      }
      const serverFields = err instanceof FunnelApiError ? mapServerFields(err.fields, questions) : {};
      if (Object.keys(serverFields).length) {
        setErrors(serverFields);
        setSummary(countErrors(serverFields));
        const first = firstErrorKey(serverFields, questions);
        if (first) focusField(first);
      }
      setSubmitError(err instanceof FunnelApiError ? (err.network ? NETWORK_MESSAGE : err.message) : SERVER_MESSAGE);
      busyRef.current = false;
      setSubmitting(false);
    }
  }

  return { values, errors, summary, website, setWebsite, submitting, submitError, update, setAnswer, blur, submit };
}

/** Scrolls to a field and focuses its first control. */
export function focusField(key: string) {
  requestAnimationFrame(() => {
    const wrap = document.querySelector<HTMLElement>(`[data-field="${key}"]`);
    const target = wrap?.querySelector<HTMLElement>("input, select, textarea, button");
    wrap?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    target?.focus({ preventScroll: true });
  });
}
