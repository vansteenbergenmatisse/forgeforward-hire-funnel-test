"use client";

import type { ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { Bold, Heading1, Heading2, ImagePlus, Italic, Link2, List, ListOrdered } from "lucide-react";
import { cn } from "@/shared/cn";

export type UrlMode = "link" | "image" | null;

function ToolButton({ label, pressed, onClick, children }: { label: string; pressed?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      // Keeps the editor selection while the button is clicked.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn("grid size-8 place-items-center rounded-md text-charcoal hover:bg-line", pressed && "bg-charcoal text-white hover:bg-charcoal")}
    >
      {children}
    </button>
  );
}

export function EditorToolbar({ editor, urlMode, onUrlMode }: { editor: Editor; urlMode: UrlMode; onUrlMode: (m: UrlMode) => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      link: e.isActive("link"),
    }),
  });
  const chain = () => editor.chain().focus();
  return (
    <div role="toolbar" aria-label="Text formatting" className="flex flex-wrap items-center gap-0.5 border-b border-line bg-white px-2 py-1.5">
      <ToolButton label="Heading 1" pressed={s.h1} onClick={() => chain().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="size-[18px]" aria-hidden />
      </ToolButton>
      <ToolButton label="Heading 2" pressed={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="size-[18px]" aria-hidden />
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-line-strong" aria-hidden />
      <ToolButton label="Bold" pressed={s.bold} onClick={() => chain().toggleBold().run()}>
        <Bold className="size-[18px]" aria-hidden />
      </ToolButton>
      <ToolButton label="Italic" pressed={s.italic} onClick={() => chain().toggleItalic().run()}>
        <Italic className="size-[18px]" aria-hidden />
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-line-strong" aria-hidden />
      <ToolButton label="Bullet list" pressed={s.bullet} onClick={() => chain().toggleBulletList().run()}>
        <List className="size-[18px]" aria-hidden />
      </ToolButton>
      <ToolButton label="Numbered list" pressed={s.ordered} onClick={() => chain().toggleOrderedList().run()}>
        <ListOrdered className="size-[18px]" aria-hidden />
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-line-strong" aria-hidden />
      <ToolButton label="Link" pressed={s.link || urlMode === "link"} onClick={() => onUrlMode(urlMode === "link" ? null : "link")}>
        <Link2 className="size-[18px]" aria-hidden />
      </ToolButton>
      <ToolButton label="Image by URL" pressed={urlMode === "image"} onClick={() => onUrlMode(urlMode === "image" ? null : "image")}>
        <ImagePlus className="size-[18px]" aria-hidden />
      </ToolButton>
    </div>
  );
}
