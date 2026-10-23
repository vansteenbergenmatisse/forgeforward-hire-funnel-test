"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pause, Play, Trash2 } from "lucide-react";
import { cn } from "@/shared/cn";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { useProjectLifecycle } from "./use-lifecycle";

/** The "..." menu on a project card: Deactivate or Reactivate (one tap, with Undo) and Delete project (asks first). */
export function ProjectActions({ slug, name, active }: { slug: string; name: string; active: boolean }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const router = useRouter();
  const { busy, deactivate, reactivate } = useProjectLifecycle(slug, name);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const item = "flex h-12 w-full items-center gap-2.5 px-3.5 text-left text-sm font-semibold hover:bg-sand disabled:opacity-50";

  return (
    <div ref={wrap} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label={`More actions for ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="grid size-12 place-items-center rounded-lg border border-line-strong bg-white text-charcoal hover:bg-sand lg:size-10"
      >
        <MoreHorizontal className="size-5" aria-hidden />
      </button>
      {open && (
        <div id={menuId} role="menu" className="absolute bottom-full right-0 z-30 mb-2 w-60 overflow-hidden rounded-xl border border-line bg-white shadow-lift">
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            className={item}
            onClick={() => {
              setOpen(false);
              void (active ? deactivate() : reactivate());
            }}
          >
            {active ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
            {active ? "Deactivate" : "Reactivate"}
          </button>
          <button
            type="button"
            role="menuitem"
            className={cn(item, "border-t border-line text-signal-deep")}
            onClick={() => {
              setOpen(false);
              setDeleting(true);
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Delete project
          </button>
        </div>
      )}
      <DeleteProjectDialog
        open={deleting}
        slug={slug}
        name={name}
        isActive={active}
        onClose={() => {
          setDeleting(false);
          trigger.current?.focus();
        }}
        onDeactivate={() => {
          setDeleting(false);
          void deactivate();
        }}
        onDeleted={() => {
          setDeleting(false);
          router.refresh();
        }}
      />
    </div>
  );
}
