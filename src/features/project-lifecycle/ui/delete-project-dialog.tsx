"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui";
import { deleteRemoteProject, previewRemoteDelete, type DeletionPreviewDto } from "@/features/projects/client";
import { showToast } from "./toast";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

type Props = {
  open: boolean;
  slug: string;
  name: string;
  isActive: boolean;
  onClose: () => void;
  onDeactivate: () => void;
  onDeleted: () => void;
};

/**
 * Confirmation for the one irreversible action. Shows live counts, offers Deactivate instead, and keeps the red button
 * disabled until the project name is typed exactly. Native dialog: Escape and the backdrop cancel, focus returns to the opener.
 */
export function DeleteProjectDialog(props: Props) {
  const { open, onClose } = props;
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onClose();
      }}
      className="m-auto max-h-[calc(100dvh-24px)] w-[min(520px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-charcoal shadow-lift backdrop:bg-charcoal/50"
    >
      {open && <DeleteBody {...props} titleId={titleId} onBusy={setBusy} />}
    </dialog>
  );
}

/** Mounted only while the dialog is open, so every opening starts clean. */
function DeleteBody({ slug, name, isActive, onClose, onDeactivate, onDeleted, titleId, onBusy }: Props & { titleId: string; onBusy: (b: boolean) => void }) {
  const inputId = useId();
  const [typed, setTyped] = useState("");
  const [preview, setPreview] = useState<DeletionPreviewDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusyState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setBusy = (b: boolean) => {
    setBusyState(b);
    onBusy(b);
  };

  useEffect(() => {
    let live = true;
    previewRemoteDelete(slug)
      .then((p) => live && setPreview(p))
      .catch((e: unknown) => live && setLoadError(e instanceof Error ? e.message : "Could not count what will be deleted."));
    return () => {
      live = false;
    };
  }, [slug]);

  const matches = typed.trim() === name.trim();

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const out = await deleteRemoteProject(slug);
      showToast(out.done ? `Deleted ${name}.` : `Deleting ${name}. It is hidden and finishes in the background.`);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the project. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const c = preview?.counts;
  return (
    <div className="p-5 sm:p-6">
      <div className="mb-3 flex items-start justify-between gap-4">
        <h2 id={titleId} className="text-[26px] leading-none">
          Delete {name}?
        </h2>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="-mr-2 -mt-2 grid size-12 shrink-0 place-items-center rounded-md text-muted hover:bg-sand hover:text-charcoal">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <p className="flex items-start gap-2 rounded-lg bg-signal-tint px-3 py-2.5 text-[14.5px] font-semibold leading-snug text-signal-deep">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        This cannot be undone. Nothing here can be brought back.
      </p>
      <p className="mt-4 text-[14.5px] font-bold">This will delete for good:</p>
      {c ? (
        <ul aria-label="What will be deleted" className="mt-2 list-disc space-y-1 pl-5 text-[14.5px] leading-snug text-muted">
          <li>
            <b className="text-charcoal">{plural(c.applicants, "applicant", "applicants")}</b> with their answers, notes, events and {plural(c.messages, "message", "messages")}
          </li>
          <li>
            <b className="text-charcoal">{plural(c.files, "video or file", "videos and files")}</b> in storage
          </li>
          <li>
            <b className="text-charcoal">{plural(c.stages, "stage", "stages")}</b>, <b className="text-charcoal">{plural(c.questions, "question", "questions")}</b> and{" "}
            <b className="text-charcoal">{plural(c.templates, "message template", "message templates")}</b>
          </li>
          <li>
            The project settings and the link <span className="font-mono text-[13px] text-charcoal">/a/{slug}</span>
          </li>
        </ul>
      ) : loadError ? (
        <p role="alert" className="mt-2 text-[14.5px] font-semibold text-signal-deep">
          {loadError}
        </p>
      ) : (
        <p role="status" className="mt-2 flex items-center gap-2 text-[14.5px] text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Counting what is in this project
        </p>
      )}

      {isActive && (
        <div className="mt-4 rounded-lg bg-sand p-3">
          <p className="text-[14px] leading-snug text-muted">Want to stop new applicants but keep everything? Deactivate instead. You can turn it back on any time.</p>
          <Button variant="secondary" className="mt-2.5 h-12 w-full sm:w-auto" disabled={busy} onClick={onDeactivate}>
            Deactivate instead
          </Button>
        </div>
      )}

      <label htmlFor={inputId} className="mt-5 block text-[14.5px] font-bold">
        Type <span className="font-mono text-[13.5px]">{name}</span> to confirm
      </label>
      <input
        id={inputId}
        data-autofocus
        autoFocus
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={busy}
        className="mt-1.5 h-12 w-full rounded-lg border border-line-strong bg-white px-3 text-base outline-none focus:border-charcoal"
      />
      {error && (
        <p role="alert" className="mt-3 text-[14.5px] font-semibold text-signal-deep">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" className="h-12" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button className="h-12" disabled={!matches || !c || busy} loading={busy} onClick={() => void remove()}>
          Delete project forever
        </Button>
      </div>
    </div>
  );
}
