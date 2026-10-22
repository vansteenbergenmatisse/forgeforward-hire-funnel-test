"use client";

import { useRef, useState } from "react";
import { AlertCircle, ArrowRight, CircleCheck, Paperclip } from "lucide-react";
import { Field, TextArea, TextInput } from "@/components/forms";
import { MainButton, StepBody, StepFooter, TextButton } from "@/components/funnel";
import { FunnelApiError, SERVER_MESSAGE } from "../api/errors";
import { uploadTaskFile } from "../api/upload-file";
import { newIdempotencyKey } from "../lib/idempotency";
import { TASK_FILE_ACCEPT, TASK_TEXT_MAX, validateTask, type TaskErrors } from "../lib/task-validation";
import type { FunnelApi, FunnelProject, FunnelSession } from "../types";
import { SkipDialog } from "./skip-dialog";
import { TaskBody } from "./task-body";

export type TaskInitial = { text?: string; link?: string; askSkip?: boolean };

/** A7 optional task plus the A15 skip confirm. */
export function TaskStep({
  project,
  session,
  api,
  initial,
  onDone,
}: {
  project: FunnelProject;
  session: FunnelSession;
  api: FunnelApi;
  initial?: TaskInitial;
  onDone: () => void;
}) {
  const [text, setText] = useState(initial?.text ?? "");
  const [link, setLink] = useState(initial?.link ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<TaskErrors>({});
  const [busy, setBusy] = useState<"submit" | "skip" | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [askSkip, setAskSkip] = useState(initial?.askSkip ?? false);
  const submitKey = useRef(newIdempotencyKey());
  const skipKey = useRef(newIdempotencyKey());
  const lock = useRef(false);

  const allow = { text: project.taskAllowText, link: project.taskAllowLink, file: project.taskAllowFile };

  async function run(skip: boolean) {
    if (lock.current) return;
    if (!skip) {
      const found = validateTask({ text, link, file }, allow);
      setErrors(found);
      if (Object.keys(found).length) return;
    }
    lock.current = true;
    setBusy(skip ? "skip" : "submit");
    setFailure(null);
    try {
      const fileKey = !skip && allow.file && file ? await uploadTaskFile(api, session.resumeToken, file) : undefined;
      await api.submitTask(
        {
          resumeToken: session.resumeToken,
          skip,
          ...(skip ? {} : { text: allow.text && text.trim() ? text.trim() : undefined, link: allow.link && link.trim() ? link.trim() : undefined, fileKey }),
        },
        skip ? skipKey.current : submitKey.current,
      );
      onDone();
    } catch (err) {
      setFailure(err instanceof FunnelApiError ? err.message : SERVER_MESSAGE);
      lock.current = false;
      setBusy(null);
      setAskSkip(false);
    }
  }

  return (
    <>
      <form
        noValidate
        className="flex flex-1 flex-col md:flex-none"
        onSubmit={(e) => {
          e.preventDefault();
          void run(false);
        }}
      >
        <StepBody>
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-ok-tint px-2.5 py-1 text-[13px] font-extrabold text-ok">
            <CircleCheck className="size-4" aria-hidden />
            Video saved
          </p>
          <h1 className="text-[32px] leading-[0.98] md:text-[40px]">{project.taskTitle}</h1>
          <p className="mt-2 text-base leading-normal text-muted md:text-[17px]">People who do it stand out.</p>
          <div className="mt-4 rounded-r-xl border-l-4 border-signal bg-white px-[18px] py-4">
            <TaskBody body={project.taskBody} />
          </div>
          <div className="mt-[18px] flex flex-col gap-4">
            {allow.text && (
              <Field label="Your text" htmlFor="t-text" error={errors.text}>
                <TextArea
                  id="t-text"
                  className="min-h-[150px]"
                  placeholder="Hi Mike, it's Sam from Forge Forward…"
                  value={text}
                  error={!!errors.text}
                  onChange={(e) => setText(e.target.value)}
                />
                <p className="text-right text-[12.5px] text-subtle" aria-live="polite">
                  {text.length.toLocaleString("en-US")} / {TASK_TEXT_MAX.toLocaleString("en-US")}
                </p>
              </Field>
            )}
            {allow.link && (
              <Field label="Link" htmlFor="t-link" optional error={errors.link}>
                <TextInput id="t-link" type="url" inputMode="url" placeholder="https://" value={link} error={!!errors.link} onChange={(e) => setLink(e.target.value)} />
              </Field>
            )}
            {allow.file && (
              <Field label="File" htmlFor="t-file" optional error={errors.file} hint="PDF, Word, text, PNG, JPG or WebP. Up to 25 MB.">
                <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line-strong bg-white px-4 text-base font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-charcoal">
                  <Paperclip className="size-5 shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0 truncate">{file ? file.name : "Choose a file"}</span>
                  <input id="t-file" type="file" accept={TASK_FILE_ACCEPT} className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </label>
              </Field>
            )}
          </div>
        </StepBody>
        <StepFooter>
          {(errors.form || failure) && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-signal-tint px-3.5 py-3 text-[14.5px] font-semibold leading-snug text-signal-deep">
              <AlertCircle className="mt-0.5 size-[18px] shrink-0" aria-hidden />
              {errors.form ?? failure}
            </p>
          )}
          <MainButton type="submit" loading={busy === "submit"} disabled={busy === "skip"}>
            {busy === "submit" ? "Sending" : "Submit task"}
            {busy !== "submit" && <ArrowRight className="size-5" aria-hidden />}
          </MainButton>
          <TextButton onClick={() => setAskSkip(true)} disabled={busy !== null}>
            Skip task
          </TextButton>
        </StepFooter>
      </form>
      <SkipDialog open={askSkip} busy={busy === "skip"} onStay={() => setAskSkip(false)} onSkip={() => void run(true)} />
    </>
  );
}
