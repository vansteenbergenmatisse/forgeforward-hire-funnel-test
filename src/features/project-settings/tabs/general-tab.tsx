"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Link2, Pencil, X } from "lucide-react";
import { buildCalLink } from "@/features/bookings";
import { Button } from "@/components/ui";
import { cn } from "@/shared/cn";
import { normalizeCalLink, validateCalLink, validateProjectName, validateReplyDays } from "../logic/general";
import { INTRO_MAX, countText } from "../logic/limits";
import { validateSlug } from "../logic/slug";
import { renameSettingsSlug } from "../store";
import type { SettingsApi } from "../use-settings";
import { Card, TwoColumn } from "../ui/card";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { DenseInput, DenseTextArea, SettingRow, Toggle } from "../ui/dense";

export function GeneralTab({ api }: { api: SettingsApi }) {
  const { project } = api.data;
  const setProject = (patch: Partial<typeof project>) => api.update((d) => ({ ...d, project: { ...d.project, ...patch } }));

  const [name, setName] = useState(project.name);
  const [nameTouched, setNameTouched] = useState(false);
  const [cal, setCal] = useState(project.calLink);
  const [calTouched, setCalTouched] = useState(false);
  const [days, setDays] = useState(String(project.replyDays));
  const [daysTouched, setDaysTouched] = useState(false);

  const nameError = nameTouched ? validateProjectName(name) : null;
  const calError = calTouched ? validateCalLink(cal) : null;
  const daysError = daysTouched ? validateReplyDays(days) : null;

  const calNormalized = normalizeCalLink(cal);
  const preview = calNormalized
    ? buildCalLink({ calLink: calNormalized, firstName: "Sam", lastName: "Rivera", email: "sam@example.com", applicantId: "a_1042" })
    : null;

  return (
    <>
      <TwoColumn
        sideWidth="520px"
        main={
          <Card title="Project" id="project">
            <div className="flex flex-col gap-4">
              <DenseInput
                label="Role name"
                value={name}
                error={nameError ?? undefined}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameTouched(true);
                  if (!validateProjectName(e.target.value)) setProject({ name: e.target.value.trim() });
                }}
                onBlur={() => setNameTouched(true)}
              />
              <SlugField slug={api.slug} />
              <DenseTextArea
                label="Intro paragraph"
                rows={4}
                value={project.intro}
                maxLength={INTRO_MAX}
                onChange={(e) => setProject({ intro: e.target.value })}
                hint={`Shows on the first screen of the application. ${countText(project.intro, INTRO_MAX)}.`}
              />
              <div className="flex flex-col gap-2">
                <DenseInput
                  label="Cal.com event link"
                  mono
                  value={cal}
                  error={calError ?? undefined}
                  onChange={(e) => {
                    setCal(e.target.value);
                    setCalTouched(true);
                    const n = normalizeCalLink(e.target.value);
                    if (n) setProject({ calLink: n });
                  }}
                  onBlur={() => setCalTouched(true)}
                />
                <div className="rounded-lg bg-sand p-3">
                  <p className="flex items-center gap-1.5 text-[13px] font-bold text-muted">
                    <Link2 className="size-3.5" aria-hidden />
                    What an applicant gets as {"{cal_link}"}
                  </p>
                  <p className="mt-1.5 break-all font-mono text-[12.5px] leading-snug text-charcoal">{preview ?? "Add a valid event link to see the personal link."}</p>
                  <p className="mt-1.5 text-[12.5px] text-subtle">Name, email and applicant id are filled in per person and URL-encoded. Sample: Sam Rivera.</p>
                </div>
              </div>
            </div>
          </Card>
        }
        side={
          <Card title="Status and rules" id="rules">
            <SettingRow
              id="open-label"
              title="Open for applications"
              description={
                project.status === "open" ? (
                  "Applicants can apply. Turn off to close the role."
                ) : (
                  <>Closed. Applicants see: &ldquo;Applications for this role are closed.&rdquo;</>
                )
              }
              control={<Toggle checked={project.status === "open"} labelledBy="open-label" onChange={(v) => setProject({ status: v ? "open" : "closed" })} />}
            />
            <SettingRow
              id="handoff-label"
              title="Handoff link"
              description="Lets people in an in-app browser finish in Chrome or Safari."
              control={<Toggle checked={project.handoffEnabled} labelledBy="handoff-label" onChange={(v) => setProject({ handoffEnabled: v })} />}
            />
            <div className="border-t border-line pt-3.5">
              <DenseInput
                label="Reply within"
                type="number"
                inputMode="numeric"
                min={1}
                max={30}
                value={days}
                inputClassName="max-w-40"
                error={daysError ?? undefined}
                hint="Shows on the thank-you page as {reply_days}. In days."
                onChange={(e) => {
                  setDays(e.target.value);
                  setDaysTouched(true);
                  if (!validateReplyDays(e.target.value)) setProject({ replyDays: Number(e.target.value) });
                }}
                onBlur={() => setDaysTouched(true)}
              />
            </div>
          </Card>
        }
      />
    </>
  );
}

/** Read-only until the pencil is pressed. Saving asks first because shared links break. */
function SlugField({ slug }: { slug: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(slug);
  const [touched, setTouched] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const error = serverError ?? (touched ? validateSlug(draft) : null);
  const changed = draft !== slug;

  async function confirm() {
    setSaving(true);
    const res = await renameSettingsSlug(slug, draft);
    setSaving(false);
    if (!res.ok) {
      setServerError(res.message);
      setConfirming(false);
      return;
    }
    setServerError(null);
    setConfirming(false);
    setEditing(false);
    router.replace(`/admin/p/${draft}/settings?tab=general`);
  }

  return (
    <div className="flex flex-col gap-2">
      <DenseInput
        label="Link slug"
        mono
        value={editing ? draft : slug}
        readOnly={!editing}
        error={error ?? undefined}
        onChange={(e) => {
          setServerError(null);
          setDraft(e.target.value.toLowerCase().replace(/\s+/g, "-"));
        }}
        onBlur={() => editing && setTouched(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setEditing(false);
            setDraft(slug);
            setTouched(false);
          }
        }}
        hint={
          <span className={cn("flex items-center gap-1.5 text-amber")}>
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            Changing the slug breaks links you already shared. We ask before saving.
          </span>
        }
      />
      <div className="flex gap-2">
        {!editing ? (
          <Button
            size="sm"
            variant="secondary"
            icon={<Pencil className="size-3.5" />}
            onClick={() => {
              setDraft(slug);
              setEditing(true);
            }}
          >
            Change slug
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="dark"
              icon={<Check className="size-3.5" />}
              onClick={() => {
                setTouched(true);
                if (!validateSlug(draft) && changed) setConfirming(true);
                else if (!changed) setEditing(false);
              }}
            >
              Review change
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<X className="size-3.5" />}
              onClick={() => {
                setEditing(false);
                setDraft(slug);
                setTouched(false);
              }}
            >
              Cancel
            </Button>
          </>
        )}
      </div>
      <ConfirmDialog open={confirming} title="Change the link slug?" confirmLabel="Change slug" tone="primary" confirmDisabled={saving} onConfirm={() => void confirm()} onCancel={() => setConfirming(false)}>
        <p>
          Links you already shared stop working. Anyone who opens <span className="font-mono text-charcoal">/{slug}</span> sees &ldquo;This page does not exist.&rdquo;
        </p>
        <p className="mt-2">
          The new link is <span className="font-mono text-charcoal">/{draft}</span>.
        </p>
      </ConfirmDialog>
    </div>
  );
}
