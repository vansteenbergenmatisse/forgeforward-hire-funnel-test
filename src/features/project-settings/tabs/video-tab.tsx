"use client";

import { useState } from "react";
import { Camera, Clock, RotateCcw } from "lucide-react";
import { VIDEO_LIMITS, estimateMegabytes, validateVideo, type VideoSettings } from "../logic/video";
import type { SettingsApi } from "../use-settings";
import { Card, TwoColumn } from "../ui/card";
import { DenseInput, DenseTextArea } from "../ui/dense";

type Key = keyof VideoSettings;

const FIELDS: { key: Key; label: string; unit: string; hint: (min: number, max: number) => string }[] = [
  { key: "prepSeconds", label: "Prep time", unit: "sec", hint: (a, b) => `${a} to ${b} seconds to read the prompt.` },
  { key: "maxRecordSeconds", label: "Max recording", unit: "sec", hint: (a, b) => `${a} to ${b} seconds.` },
  { key: "retakesAllowed", label: "Retakes allowed", unit: "", hint: (a, b) => `${a} to ${b}. 0 means no retake.` },
];

export function VideoTab({ api }: { api: SettingsApi }) {
  const { project } = api.data;
  const [drafts, setDrafts] = useState<Record<Key, string>>({
    prepSeconds: String(project.prepSeconds),
    maxRecordSeconds: String(project.maxRecordSeconds),
    retakesAllowed: String(project.retakesAllowed),
  });
  const [touched, setTouched] = useState<Partial<Record<Key, boolean>>>({});
  const [promptTouched, setPromptTouched] = useState(false);

  const numeric: VideoSettings = {
    prepSeconds: drafts.prepSeconds.trim() === "" ? NaN : Number(drafts.prepSeconds),
    maxRecordSeconds: drafts.maxRecordSeconds.trim() === "" ? NaN : Number(drafts.maxRecordSeconds),
    retakesAllowed: drafts.retakesAllowed.trim() === "" ? NaN : Number(drafts.retakesAllowed),
  };
  const errors = validateVideo(numeric);
  const promptError = promptTouched && project.videoPrompt.trim() === "" ? "Write the prompt applicants read before they record." : undefined;

  function change(key: Key, value: string) {
    const next = { ...drafts, [key]: value };
    setDrafts(next);
    const n = (v: string) => (v.trim() === "" ? NaN : Number(v));
    const candidate: VideoSettings = { prepSeconds: n(next.prepSeconds), maxRecordSeconds: n(next.maxRecordSeconds), retakesAllowed: n(next.retakesAllowed) };
    if (!validateVideo(candidate)[key]) api.update((d) => ({ ...d, project: { ...d.project, [key]: candidate[key] } }));
  }

  const prep = Number.isFinite(numeric.prepSeconds) && !errors.prepSeconds ? numeric.prepSeconds : project.prepSeconds;
  const max = Number.isFinite(numeric.maxRecordSeconds) && !errors.maxRecordSeconds ? numeric.maxRecordSeconds : project.maxRecordSeconds;

  return (
    <TwoColumn
      sideWidth="420px"
      main={
        <Card title="Video step" id="video">
          <div className="flex flex-col gap-4">
            <DenseTextArea
              label="Prompt"
              rows={4}
              value={project.videoPrompt}
              error={promptError}
              onChange={(e) => api.update((d) => ({ ...d, project: { ...d.project, videoPrompt: e.target.value } }))}
              onBlur={() => setPromptTouched(true)}
              hint="Applicants read this before they record."
            />
            <div className="grid gap-4 sm:grid-cols-3">
              {FIELDS.map((f) => (
                <DenseInput
                  key={f.key}
                  label={f.unit ? `${f.label} (${f.unit})` : f.label}
                  type="number"
                  inputMode="numeric"
                  min={VIDEO_LIMITS[f.key].min}
                  max={VIDEO_LIMITS[f.key].max}
                  value={drafts[f.key]}
                  error={touched[f.key] ? errors[f.key] : undefined}
                  hint={f.hint(VIDEO_LIMITS[f.key].min, VIDEO_LIMITS[f.key].max)}
                  onChange={(e) => change(f.key, e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, [f.key]: true }))}
                />
              ))}
            </div>
            <p className="rounded-lg bg-sand p-3 text-[13.5px] leading-snug text-muted">
              Videos record at 720p and about 1.2 Mbps. A {max} second video is about {estimateMegabytes(max)} MB.
            </p>
          </div>
        </Card>
      }
      side={
        <Card title="What applicants see" id="video-preview">
          <div className="overflow-hidden rounded-xl bg-charcoal p-4 text-white">
            <p className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-side-muted">
              <Camera className="size-3.5" aria-hidden />
              Your prompt
            </p>
            <p className="mt-2 text-[15.5px] leading-snug">{project.videoPrompt.trim() || "Your prompt shows here."}</p>
          </div>
          <ul className="mt-3 flex flex-col gap-2 text-[14px]">
            <li className="flex items-center gap-2.5 rounded-lg bg-sand px-3 py-2.5">
              <Clock className="size-4 shrink-0 text-muted" aria-hidden />
              {prep === 0 ? "No prep time. Recording can start right away." : `${prep} seconds to prepare.`}
            </li>
            <li className="flex items-center gap-2.5 rounded-lg bg-sand px-3 py-2.5">
              <Camera className="size-4 shrink-0 text-muted" aria-hidden />
              Record up to {max} seconds.
            </li>
            <li className="flex items-center gap-2.5 rounded-lg bg-sand px-3 py-2.5">
              <RotateCcw className="size-4 shrink-0 text-muted" aria-hidden />
              {project.retakesAllowed === 0 ? "No retakes." : `${project.retakesAllowed} ${project.retakesAllowed === 1 ? "retake" : "retakes"} allowed.`}
            </li>
          </ul>
        </Card>
      }
    />
  );
}
