"use client";
import { ADMIN_BASE_PATH } from "@/features/admin-access";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { AdminShell, PageHeader } from "@/components/layout";
import { Banner, Button } from "@/components/ui";
import { useApplicants } from "@/features/applicants";
import { useSystemAlerts } from "@/features/backups";
import { LifecycleToaster } from "@/features/project-lifecycle";
import { useProjects } from "../store";
import { AlertBanner } from "./alert-banner";
import { NewProjectDialog } from "./new-project-dialog";
import { ProjectCard } from "./project-card";
import { UnmatchedBookings } from "./unmatched-bookings";

/** Projects home (/adminMatt): project cards, new project, unmatched bookings, system banner. */
export function ProjectsHome() {
  const router = useRouter();
  const { state, actions } = useProjects();
  const { applicants, actions: applicantActions, error: applicantsError, truncated: applicantsTruncated, reload: reloadApplicants } = useApplicants();
  const [creating, setCreating] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tileRef = useRef<HTMLButtonElement>(null);
  // Active projects first, inactive ones below. Creation order is kept inside each group.
  const sorted = useMemo(() => [...state.projects.filter((p) => p.def.status === "open"), ...state.projects.filter((p) => p.def.status !== "open")], [state.projects]);
  const first = sorted[0]?.def.name;
  const empty = !state.loading && !state.error && state.projects.length === 0;
  const { alerts: activeAlerts, resolve: resolveAlert } = useSystemAlerts();

  // Saves the booking on the applicant (moves the card on the server). The row is marked linked only after the server agreed.
  async function linkBooking(bookingId: string, applicantId: string): Promise<boolean> {
    const booking = state.bookings.find((b) => b.id === bookingId);
    if (!booking) return false;
    const ok = await applicantActions.linkBooking(applicantId, { id: booking.id, start: booking.start, title: booking.title });
    if (ok) actions.linkBooking(bookingId, applicantId);
    else await actions.refreshBookings();
    return ok;
  }

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
      <main className="flex flex-col gap-[18px] px-4 py-[22px] sm:px-7">
        {applicantsError && (
          <Banner
            action={
              <Button variant="secondary" size="sm" onClick={reloadApplicants}>
                Try again
              </Button>
            }
          >
            {applicantsError === "session" ? "Your session ended. Open your admin link again to sign in." : "Could not load the applicant numbers. Check your connection."}
          </Banner>
        )}
        {applicantsTruncated && (
          <Banner tone="warning">There are more applicants than this screen can load, so the numbers below only count the newest ones.</Banner>
        )}
        {activeAlerts.map((a) => (
          <AlertBanner key={a.id} alert={a} onResolve={a.id.startsWith("errors:") ? () => void resolveAlert(a.id) : undefined} />
        ))}
        {empty ? (
          <div className="flex flex-col items-center gap-3 rounded-[14px] border-2 border-dashed border-line-strong px-6 py-14 text-center">
            <p className="font-display text-[28px] leading-none">No projects yet</p>
            <p className="max-w-sm text-[15px] text-muted">Create a project to get an application link and a board for the people who apply.</p>
            <Button className="h-12" icon={<Plus className="size-4" aria-hidden />} onClick={(e) => open(e.currentTarget)}>
              Create project
            </Button>
          </div>
        ) : (
        <div className="grid items-stretch gap-[18px] xl:grid-cols-[1fr_340px]">
          <div className="flex min-w-0 flex-col gap-[18px]">
            {sorted.map((p) => (
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
        )}
        <UnmatchedBookings bookings={state.bookings} applicants={applicants} onLink={linkBooking} onDismiss={actions.dismissBooking} />
      </main>
      <LifecycleToaster />
      <NewProjectDialog
        open={creating}
        projects={state.projects}
        returnFocusRef={triggerRef}
        onClose={() => setCreating(false)}
        onCreate={async (input) => {
          const record = await actions.createProject(input);
          router.push(`${ADMIN_BASE_PATH}/p/${record.def.slug}`);
        }}
      />
    </AdminShell>
  );
}
