"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { FileUp, Link2, MessageSquareText } from "lucide-react";
import { cn } from "@/shared/cn";
import { PROSE, taskExtensions } from "./task-extensions";

/** Read-only render of the task body. Uses the same schema as the editor, so no raw HTML is injected. Links open in a new tab. */
function TaskBody({ html }: { html: string }) {
  const editor = useEditor({ extensions: taskExtensions(), content: html, editable: false, immediatelyRender: false, editorProps: { attributes: { role: "document", "aria-label": "Task as applicants see it", class: PROSE } } });
  useEffect(() => {
    if (editor && editor.getHTML() !== html) editor.commands.setContent(html, { emitUpdate: false });
  }, [editor, html]);
  return editor ? <EditorContent editor={editor} /> : null;
}

function FakeField({ icon, label, tall }: { icon: React.ReactNode; label: string; tall?: boolean }) {
  return (
    <div aria-hidden className={cn("flex items-start gap-2 rounded-lg border border-line-strong bg-white px-3 py-2.5 text-[13.5px] text-placeholder", tall ? "h-20" : "h-10 items-center")}>
      {icon}
      {label}
    </div>
  );
}

export function TaskPreview({ enabled, title, html, text, link, file }: { enabled: boolean; title: string; html: string; text: boolean; link: boolean; file: boolean }) {
  if (!enabled) {
    return <p className="rounded-lg bg-sand p-4 text-[14.5px] leading-snug text-muted">The task is off. Applicants go straight to the thank-you page.</p>;
  }
  return (
    <div className="rounded-xl border border-line bg-ivory p-4">
      <p className="font-display text-[24px] leading-none">{title.trim() || "Task title"}</p>
      <div className="mt-2">{html ? <TaskBody html={html} /> : <p className="text-[14.5px] text-subtle">The task text shows here.</p>}</div>
      <div className="mt-3 flex flex-col gap-2">
        {text && <FakeField tall icon={<MessageSquareText className="mt-0.5 size-4" />} label="Type your answer" />}
        {link && <FakeField icon={<Link2 className="size-4" />} label="Paste a link" />}
        {file && <FakeField icon={<FileUp className="size-4" />} label="Choose a file" />}
      </div>
    </div>
  );
}
