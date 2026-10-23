"use client";
import { ADMIN_BASE_PATH } from "@/features/admin-access";

import { useMemo } from "react";
import Link from "next/link";
import { LayoutGrid, Settings } from "lucide-react";
import { Badge, toneDot } from "@/components/ui";
import { ProjectActions } from "@/features/project-lifecycle";
import { boardCount, didNotFinishCount, stageCounts, useApplicants } from "@/features/applicants";
import { startedThisWeek } from "../weekly";
import type { ProjectRecord } from "../types";
import { CopyLinkButton } from "./copy-link-button";

export const FUNNEL_HOST = "apply.forgeforward.io";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-display text-[30px] leading-none">{value}</p>
      <p className="mt-1 text-xs font-semibold text-muted">{label}</p>
    </div>
  );
}

export function ProjectCard({ project }: { project: ProjectRecord }) {
  const { slug, name, status } = project.def;
  const { applicants } = useApplicants(slug);
  const counts = useMemo(() => stageCounts(applicants, project.stages), [applicants, project.stages]);
  const week = useMemo(() => startedThisWeek(applicants.filter((a) => !a.isTest).map((a) => a.createdAt), new Date()), [applicants]);
  const active = status === "open";
  const funnelUrl = `${FUNNEL_HOST}/a/${slug}`;

  return (
    <article aria-label={name} data-status={active ? "active" : "inactive"} className={`rounded-[14px] border border-line px-5 py-[18px] ${active ? "bg-white" : "bg-sand/60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[26px] leading-none">{name}</h2>
          <p className="mt-1.5 text-[13px] text-muted">/a/{slug}</p>
        </div>
        <Badge tone={active ? "green" : "gray"} dot>
          {active ? "Active" : "Inactive"}
        </Badge>
      </div>
      <div className="mt-[18px] flex flex-wrap gap-x-[34px] gap-y-3">
        <Stat value={week} label="Applicants this week" />
        <Stat value={boardCount(applicants)} label="On the board" />
        <Stat value={didNotFinishCount(applicants)} label="Did not finish" />
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2" aria-label="Applicants per stage">
        {project.stages.map((s) => (
          <li key={s.id} className="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
            <span className={`size-2 rounded-full ${toneDot[s.color]}`} aria-hidden />
            {s.name} <b className="text-charcoal">{counts[s.id] ?? 0}</b>
          </li>
        ))}
      </ul>
      {!active && <p className="mt-3 text-[13px] text-muted">Inactive. Its link shows a closed notice. Nothing is deleted.</p>}
      <div className="mt-[18px] flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
        <div className="flex h-12 w-full min-w-0 flex-1 basis-full items-center justify-between gap-2 rounded-[9px] border border-line-strong bg-white pl-3 pr-1.5 text-sm sm:basis-64 lg:h-11 items-center justify-between gap-2 rounded-[9px] border border-line-strong bg-white pl-3 pr-1.5 text-sm">
          <span className="truncate" title={funnelUrl}>
            {funnelUrl}
          </span>
          <CopyLinkButton text={`https://${funnelUrl}`} />
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Link
            href={`${ADMIN_BASE_PATH}/p/${slug}`}
            className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-[7px] whitespace-nowrap rounded-[9px] bg-charcoal px-3.5 text-sm font-bold text-white hover:bg-charcoal-2 lg:h-10"
          >
            <LayoutGrid className="size-4" aria-hidden />
            Open board
          </Link>
          <Link
            href={`${ADMIN_BASE_PATH}/p/${slug}/settings`}
            className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-[7px] whitespace-nowrap rounded-[9px] border border-line-strong bg-white px-3.5 text-sm font-bold text-charcoal hover:bg-sand lg:h-10"
          >
            <Settings className="size-4" aria-hidden />
            Edit project
          </Link>
          <ProjectActions slug={slug} name={name} active={active} />
        </div>
      </div>
    </article>
  );
}
