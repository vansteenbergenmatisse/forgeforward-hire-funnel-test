"use client";
import { ADMIN_BASE_PATH } from "@/features/admin-access";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { useProjectLifecycle } from "./use-lifecycle";

/** Active or inactive, with a one-tap switch. Inactive shows the closed notice on the public link; the data stays. */
export function ProjectStatusControl({ slug, name, active }: { slug: string; name: string; active: boolean }) {
  const { busy, error, deactivate, reactivate } = useProjectLifecycle(slug, name);
  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button
        variant={active ? "secondary" : "dark"}
        className="h-12 lg:h-10"
        loading={busy}
        icon={active ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
        onClick={() => void (active ? deactivate() : reactivate())}
      >
        {active ? "Deactivate" : "Reactivate"}
      </Button>
      {error && (
        <p role="alert" className="text-[13px] font-semibold text-signal-deep">
          {error}
        </p>
      )}
    </div>
  );
}

/** Separate, clearly marked block at the bottom of Settings > General. */
export function ProjectDangerZone({ slug, name, active }: { slug: string; name: string; active: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { deactivate } = useProjectLifecycle(slug, name);
  return (
    <section aria-labelledby="danger-zone-title" className="rounded-xl border-2 border-signal/40 bg-white p-5">
      <h2 id="danger-zone-title" className="font-sans! text-[19px] font-extrabold! normal-case! leading-tight tracking-normal! text-signal-deep">
        Danger zone
      </h2>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div>
          <p className="text-[14.5px] font-bold leading-snug">Delete this project</p>
          <p className="mt-0.5 text-[13px] leading-snug text-muted">
            Removes the project, every applicant, all videos and files, stages, questions and templates. This cannot be undone. To only stop new applicants, use Deactivate.
          </p>
        </div>
        <Button className="h-12 shrink-0 lg:h-10" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => setOpen(true)}>
          Delete project
        </Button>
      </div>
      <DeleteProjectDialog
        open={open}
        slug={slug}
        name={name}
        isActive={active}
        onClose={() => setOpen(false)}
        onDeactivate={() => {
          setOpen(false);
          void deactivate();
        }}
        onDeleted={() => {
          setOpen(false);
          router.push(ADMIN_BASE_PATH);
        }}
      />
    </section>
  );
}
