"use client";

import { useRef, useState, type Ref } from "react";
import { Trash2 } from "lucide-react";
import { TEMPLATE_VARIABLES } from "@/features/messaging";
import type { TemplateDef } from "@/features/projects";
import { Button } from "@/components/ui";
import { CHANNELS, SAMPLE_APPLICANT, validateTemplate } from "../logic/templates";
import { DenseInput, DenseTextArea } from "./dense";
import { TemplatePreview } from "./template-preview";
import { VariableChips, useCursorInsert } from "./variable-chips";
import { WhatsAppFields } from "./whatsapp-fields";

/** Edits one template. Changes save as you type. Chips insert at the caret of the last field you used (subject or body). */
export function TemplateEditor({ template, sample, autoFocus, onChange, onDelete }: { template: TemplateDef; sample: Record<string, string>; autoFocus: boolean; onChange: (p: Partial<TemplateDef>) => void; onDelete: () => void }) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const active = useRef<"subject" | "body">("body");
  const { ref: bodyRef, insert: insertBody } = useCursorInsert(() => template.body, (v) => onChange({ body: v }));
  const { ref: subjectRef, insert: insertSubject } = useCursorInsert(() => template.subject, (v) => onChange({ subject: v }));
  const errors = validateTemplate(template);
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const channelLabel = CHANNELS.find((c) => c.id === template.channel)?.label ?? "";
  const shownSample = { ...SAMPLE_APPLICANT, ...sample };

  return (
    <div className="flex flex-col gap-4">
      <DenseInput label="Name" autoFocus={autoFocus} value={template.name} error={touched.name ? errors.name : undefined} onChange={(e) => onChange({ name: e.target.value })} onBlur={() => touch("name")} />
      {template.channel === "email" && (
        <DenseInput
          ref={subjectRef as Ref<HTMLInputElement>}
          label="Subject"
          value={template.subject}
          error={touched.subject ? errors.subject : undefined}
          onFocus={() => (active.current = "subject")}
          onChange={(e) => onChange({ subject: e.target.value })}
          onBlur={() => touch("subject")}
        />
      )}
      <DenseTextArea
        ref={bodyRef as Ref<HTMLTextAreaElement>}
        label="Body"
        rows={6}
        value={template.body}
        error={touched.body ? errors.body : undefined}
        onFocus={() => (active.current = "body")}
        onChange={(e) => onChange({ body: e.target.value })}
        onBlur={() => touch("body")}
      />
      <div className="flex flex-col gap-1.5">
        <VariableChips variables={TEMPLATE_VARIABLES} onInsert={(tok) => (template.channel === "email" && active.current === "subject" ? insertSubject(tok) : insertBody(tok))} label="Tap to add a variable" />
        <p className="text-[13px] text-subtle">A missing variable blocks the send and names it.</p>
      </div>
      {template.channel === "whatsapp" && <WhatsAppFields t={template} errors={errors} touched={!!touched.wa || !!touched.name} onChange={onChange} onTouch={() => touch("wa")} />}
      <TemplatePreview template={template} sample={shownSample} />
      <div className="flex justify-between border-t border-line pt-3">
        <p className="self-center text-[13px] text-subtle">
          {template.name.trim() || "Untitled"} · {channelLabel}
        </p>
        <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={onDelete}>
          Delete template
        </Button>
      </div>
    </div>
  );
}
