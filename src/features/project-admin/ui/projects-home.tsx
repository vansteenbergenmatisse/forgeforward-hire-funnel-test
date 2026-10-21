"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { AdminShell, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui";
import { useApplicants } from "@/features/applicants";
import { useProjects } from "../store";
import { AlertBanner } from "./alert-banner";
import { NewProjectDialog } from "./new-project-dialog";
import { ProjectCard } from "./project-card";
import { UnmatchedBookings } from "./unmatched-bookings";

/** Projects home (/admin): project cards, new project, unmatched bookings, system banner. */
export function ProjectsHome() {
  const router = useRouter();
  const { state, actions } = useProjects();
  const { applicants } = useApplicants();
  const [creating, setCreating] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tileRef = useRef<HTMLButtonElement>(null);
  const first = state.projects[0]?.def.name;
  const activeAlerts = state.alerts.filter((a) => !a.resolved);

  function open(from: HTMLButtonElement | null) {
    triggerRef.current = from;
    setCreating(true);
  }

  return (
    <AdminShell active="projects">
      <PageHeader
        title="Projects"
        actions={
          <Button icon={<Plus className="size-4" aria-hidden />} onClick={(e) => open(e.currentTarget)}>
            New project
          </Button>
        }
      />
      <main className="flex flex-col gap-[18px] px-7 py-[22px]">
        {activeAlerts.map((a) => (
          <AlertBanner key={a.id} alert={a} onResolve={() => actions.resolveAlert(a.id)} />
        ))}
        <div className="grid items-stretch gap-[18px] xl:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-[18px]">
            {state.projects.map((p) => (
              <ProjectCard key={p.def.slug} project={p} />
            ))}
          </div>
          <button
            type="button"
            ref={tileRef}
            onClick={(e) => open(e.currentTarget)}
            className="flex min-h-64 flex-col items-center justify-center self-start xl:sticky xl:top-6 gap-2.5 rounded-[14px] border-2 border-dashed border-line-strong text-[15px] font-bold text-muted transition-colors hover:border-charcoal hover:text-charcoal"
          >
            <span className="grid size-[46px] place-items-center rounded-full border border-line bg-white text-charcoal">
              <Plus className="size-[22px]" aria-hidden />
            </span>
            New project
            <span className="text-[13px] font-medium">Start blank{first ? ` or copy ${first}` : ""}</span>
          </button>
        </div>
        <UnmatchedBookings bookings={state.bookings} applicants={applicants} onLink={actions.linkBooking} onDismiss={actions.dismissBooking} />
      </main>
      <NewProjectDialog
        open={creating}
        projects={state.projects}
        returnFocusRef={triggerRef}
        onClose={() => setCreating(false)}
        onCreate={(input) => {
          const record = actions.createProject(input);
          router.push(`/admin/p/${record.def.slug}`);
        }}
      />
    </AdminShell>
  );
}
