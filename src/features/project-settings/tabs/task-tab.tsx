"use client";

import { useId, useState } from "react";
import { FileUp, Link2, MessageSquareText } from "lucide-react";
import { taskBodyText, validateTask } from "../logic/task";
import type { SettingsApi } from "../use-settings";
import { Card, TwoColumn } from "../ui/card";
import { DenseInput, SettingRow, Toggle } from "../ui/dense";
import { RichEditor } from "../ui/rich-editor";
import { TaskPreview } from "../ui/task-preview";

export function TaskTab({ api }: { api: SettingsApi }) {
  const { project, stages } = api.data;
  const bodyLabel = useId();
  const [touched, setTouched] = useState({ title: false, body: false });
  const errors = validateTask(project);
  const setProject = (p: Partial<typeof project>) => api.update((d) => ({ ...d, project: { ...d.project, ...p } }));
  const entryTask = stages.find((s) => s.role === "entry_task")?.name ?? "the Did task stage";
  const entryNew = stages.find((s) => s.role === "entry_new")?.name ?? "the New stage";
  const showErrors = project.taskEnabled;

  return (
    <TwoColumn
      sideWidth="420px"
      main={
        <>
          <Card id="task" title="Optional task">
            <SettingRow
              id="task-on"
              title={project.taskEnabled ? "Task is on" : "Task is off"}
              description="Applicants can do a short task after the video."
              control={<Toggle checked={project.taskEnabled} labelledBy="task-on" onChange={(v) => setProject({ taskEnabled: v })} />}
            />
            {project.taskEnabled && (
              <div className="mt-2 flex flex-col gap-4">
                <DenseInput
                  label="Title"
                  value={project.taskTitle}
                  error={showErrors && touched.title ? errors.title : undefined}
                  onChange={(e) => setProject({ taskTitle: e.target.value })}
                  onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                />
                <div className="flex flex-col gap-1.5">
                  <p id={bodyLabel} className="text-[14px] font-bold leading-snug">
                    Task
                  </p>
                  <RichEditor
                    html={project.taskBody}
                    labelId={bodyLabel}
                    error={showErrors && touched.body && !!errors.body}
                    onChange={(html) => setProject({ taskBody: html })}
                    onBlur={() => setTouched((t) => ({ ...t, body: true }))}
                  />
                  {showErrors && touched.body && errors.body && (
                    <p role="alert" className="text-[13.5px] font-semibold text-signal-deep">
                      {errors.body}
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>
          {project.taskEnabled && (
            <Card id="answers" title="Answer fields">
              <SettingRow
                id="ans-text"
                title="Text answer"
                description="Up to 5,000 characters."
                control={<Toggle checked={project.taskAllowText} labelledBy="ans-text" onChange={(v) => setProject({ taskAllowText: v })} />}
              />
              <SettingRow
                id="ans-link"
                title="Link"
                description="Must be a valid URL."
                control={<Toggle checked={project.taskAllowLink} labelledBy="ans-link" onChange={(v) => setProject({ taskAllowLink: v })} />}
              />
              <SettingRow
                id="ans-file"
                title="File upload"
                description="Up to 25 MB."
                control={<Toggle checked={project.taskAllowFile} labelledBy="ans-file" onChange={(v) => setProject({ taskAllowFile: v })} />}
              />
              {errors.answers && (
                <p role="alert" className="mt-1 text-[13.5px] font-semibold text-signal-deep">
                  {errors.answers}
                </p>
              )}
            </Card>
          )}
          <p className="flex items-start gap-2 text-[14px] leading-snug text-muted">
            <span className="mt-0.5 flex gap-1 text-subtle" aria-hidden>
              <MessageSquareText className="size-4" />
              <Link2 className="size-4" />
              <FileUp className="size-4" />
            </span>
            <span>
              Did the task: the card lands in <strong className="text-charcoal">{entryTask}</strong>. Skipped or task off: it lands in <strong className="text-charcoal">{entryNew}</strong>.
            </span>
          </p>
        </>
      }
      side={
        <Card title="What applicants see" id="task-preview">
          <TaskPreview
            enabled={project.taskEnabled}
            title={project.taskTitle}
            html={taskBodyText(project.taskBody) ? project.taskBody : ""}
            text={project.taskAllowText}
            link={project.taskAllowLink}
            file={project.taskAllowFile}
          />
          <p className="mt-3 text-[13px] text-subtle">Links in the task open in a new tab.</p>
        </Card>
      }
    />
  );
}
