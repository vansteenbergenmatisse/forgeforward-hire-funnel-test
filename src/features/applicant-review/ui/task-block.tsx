import { Download, ExternalLink } from "lucide-react";
import type { ApplicantView } from "@/features/applicants";
import { formatBytes } from "../lib/format";
import { safeHref } from "../lib/answer-text";
import { Section } from "./section";

export function TaskBlock({ a }: { a: ApplicantView }) {
  const link = a.taskLink ? safeHref(a.taskLink) : null;
  const hasAny = a.taskText || a.taskLink || a.taskFile;
  return (
    <Section title="Task">
      {!hasAny ? (
        <p className="text-sm text-muted">{a.didTask ? "No task content saved." : "Did not do the task."}</p>
      ) : (
        <div className="space-y-3">
          {a.taskText && <blockquote className="rounded-lg bg-sand px-4 py-3 text-base leading-relaxed text-charcoal">{a.taskText}</blockquote>}
          {a.taskLink && (
            <p className="text-sm">
              {link ? (
                <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 break-all font-semibold text-blue underline">
                  {a.taskLink}
                  <ExternalLink className="size-3.5 shrink-0" aria-label="Opens in a new tab" />
                </a>
              ) : (
                <span className="break-all">{a.taskLink}</span>
              )}
            </p>
          )}
          {a.taskFile && (
            <a
              href={a.taskFile.url}
              download={a.taskFile.name}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-white px-3 text-sm font-bold text-charcoal hover:bg-sand"
            >
              <Download className="size-4" aria-hidden />
              {a.taskFile.name}
              <span className="font-medium text-muted">{formatBytes(a.taskFile.bytes)}</span>
            </a>
          )}
        </div>
      )}
    </Section>
  );
}
