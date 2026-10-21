import { AlertTriangle } from "lucide-react";
import type { TemplateDef } from "@/features/projects";
import { previewText } from "../logic/templates";

/** Live preview filled with sample applicant data. Missing variables are named, because a real send is blocked for them. */
export function TemplatePreview({ template, sample }: { template: TemplateDef; sample: Record<string, string> }) {
  const body = previewText(template.body, sample);
  const subject = previewText(template.subject, sample);
  const missing = Array.from(new Set([...subject.missing, ...body.missing]));
  return (
    <div>
      <h3 className="mb-2 font-sans! text-[14px] font-bold normal-case! tracking-normal!">Preview with sample data</h3>
      {missing.length > 0 && (
        <p role="alert" className="mb-2 flex items-start gap-2 rounded-lg bg-amber-tint px-3 py-2 text-[13.5px] font-semibold text-amber">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          No value for {missing.map((m) => `{${m}}`).join(", ")}. A send would be blocked and name it.
        </p>
      )}
      <div className="rounded-xl border border-line bg-ivory p-4">
        {template.channel === "email" && <p className="mb-2 border-b border-line pb-2 text-[14px] font-bold">{subject.text || <span className="font-medium text-subtle">No subject</span>}</p>}
        <p className="whitespace-pre-wrap break-words text-[14.5px] leading-snug">{body.text || <span className="text-subtle">The message shows here.</span>}</p>
        {template.channel === "whatsapp" && <p className="mt-3 text-[12.5px] text-subtle">Sent as the approved Meta template, with variables in the order set above.</p>}
        {template.channel === "sms" && <p className="mt-3 text-[12.5px] text-subtle">{body.text.length} characters.</p>}
      </div>
    </div>
  );
}
