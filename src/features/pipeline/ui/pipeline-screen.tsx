"use client";
import { ADMIN_BASE_PATH } from "@/features/admin-access";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import type { Channel } from "@/features/projects";
import { ApplicantDrawer } from "@/features/applicant-review";
import { useProjects } from "@/features/project-admin";
import {
  EMPTY_FILTERS,
  boardCount,
  buildApplicantsCsv,
  didNotFinishCount,
  downloadCsv,
  filterApplicants,
  hasActiveFilters,
  sortApplicants,
  useApplicants,
  type ApplicantFilters,
  type SortKey,
} from "@/features/applicants";
import { AdminShell, PageHeader } from "@/components/layout";
import { Banner, Button } from "@/components/ui";
import { primaryQuestion } from "../logic/card-text";
import { loadErrorText } from "../logic/load-messages";
import { pipelineHref, type PipelineTab } from "../logic/tabs";
import { DEFAULT_TABLE_SORT, sortTableRows, type TableSort } from "../logic/table-sort";
import { useMounted } from "../use-mounted";
import { useNow } from "../use-now";
import { ApplicantsTable } from "./applicants-table";
import { Board } from "./board";
import { DnfList } from "./dnf-list";
import { FunnelLinkChip } from "./funnel-link-chip";
import { LoadError } from "./load-error";
import { NoMatches } from "./no-matches";
import { PipelineSkeleton } from "./pipeline-skeleton";
import { ProjectNotFound } from "./project-not-found";
import { Toolbar, type SortOption } from "./toolbar";

type Props = { slug: string; tab: PipelineTab; applicantId?: string; sendChannel?: Channel; autoPlay?: boolean };

const CARD_SORTS: SortOption[] = [
  { value: "newest", label: "Newest first" },
  { value: "score", label: "Score" },
];

const NAV_ACTIVE = { board: "board", dnf: "dnf", table: "table" } as const;

export function PipelineScreen(props: Props) {
  const { state, actions } = useProjects();
  const mounted = useMounted();
  const record = state.projects.find((p) => p.def.slug === props.slug);
  if (!record) {
    if (state.error) return <LoadError title="Could not load the project" message="Could not reach the server. Check your connection." onRetry={actions.reset} />;
    return mounted && !state.loading ? <ProjectNotFound slug={props.slug} /> : <PipelineSkeleton slug={props.slug} />;
  }
  return <ProjectPipeline {...props} record={record} />;
}

function ProjectPipeline({ slug, tab, applicantId, sendChannel, autoPlay, record }: Props & { record: NonNullable<ReturnType<typeof useProjects>["state"]["projects"][number]> }) {
  const router = useRouter();
  const now = useNow();
  const { applicants, actions, loading, error, truncated, reload } = useApplicants(slug);
  const { stages, def, questions } = record;
  const question = useMemo(() => primaryQuestion(questions), [questions]);

  const [filters, setFilters] = useState<ApplicantFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("newest");
  const [tableSort, setTableSort] = useState<TableSort>(DEFAULT_TABLE_SORT);

  const filtered = useMemo(() => filterApplicants(applicants, filters), [applicants, filters]);
  const onBoard = useMemo(() => filtered.filter((a) => a.stageId !== null), [filtered]);
  const boardCards = useMemo(() => sortApplicants(onBoard, sort), [onBoard, sort]);
  const dnfCards = useMemo(() => sortApplicants(filtered.filter((a) => a.stageId === null), sort), [filtered, sort]);
  const tableRows = useMemo(() => sortTableRows(onBoard, tableSort, { stages, question, now }), [onBoard, tableSort, stages, question, now]);

  const isFiltered = hasActiveFilters(filters);
  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const open = (id: string, play?: boolean) => router.push(pipelineHref(slug, tab, id) + (play ? "&play=1" : ""), { scroll: false });
  const close = () => router.push(pipelineHref(slug, tab), { scroll: false });

  // Focus goes back to the card (or row) that opened the drawer.
  const lastOpened = useRef<string | null>(null);
  useEffect(() => {
    if (applicantId) {
      lastOpened.current = applicantId;
      return;
    }
    const id = lastOpened.current;
    lastOpened.current = null;
    if (id) document.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(id)}"]`)?.focus();
  }, [applicantId]);

  const drawerApplicant = applicantId ? applicants.find((a) => a.id === applicantId) : undefined;

  const tableSortValue = tableSort.dir === "desc" && tableSort.key === "applied" ? "newest" : tableSort.dir === "desc" && tableSort.key === "score" ? "score" : "custom";
  const sortProps =
    tab === "table"
      ? {
          sortValue: tableSortValue,
          sortOptions: tableSortValue === "custom" ? [...CARD_SORTS, { value: "custom", label: "By column" }] : CARD_SORTS,
          onSort: (v: string) => v !== "custom" && setTableSort({ key: v === "score" ? "score" : "applied", dir: "desc" }),
        }
      : { sortValue: sort, sortOptions: CARD_SORTS, onSort: (v: string) => setSort(v === "score" ? "score" : "newest") };

  const exportCsv = () => downloadCsv(`${slug}-applicants-${now.toISOString().slice(0, 10)}.csv`, buildApplicantsCsv(tableRows, stages, question, now));

  // Without data, say why instead of showing empty columns that look like "no applicants".
  if (loading) return <PipelineSkeleton slug={slug} />;
  if (error && applicants.length === 0) return <LoadError title="Could not load applicants" message={loadErrorText(error)} onRetry={reload} />;

  return (
    <AdminShell active={NAV_ACTIVE[tab]} project={{ slug, name: def.name, boardCount: boardCount(applicants), dnfCount: didNotFinishCount(applicants) }}>
      <PageHeader
        crumb={
          <Link href={ADMIN_BASE_PATH} className="hover:text-charcoal">
            Projects
          </Link>
        }
        title={def.name}
        actions={
          <>
            {tab === "table" && (
              <Button variant="secondary" icon={<Download className="size-4" aria-hidden />} onClick={exportCsv} disabled={tableRows.length === 0}>
                Export CSV
              </Button>
            )}
            <FunnelLinkChip slug={slug} open={def.status === "open"} />
          </>
        }
        tabs={[
          { href: pipelineHref(slug, "board"), label: "Board", active: tab === "board" },
          { href: pipelineHref(slug, "dnf"), label: "Did not finish", active: tab === "dnf" },
          { href: pipelineHref(slug, "table"), label: "Table", active: tab === "table" },
        ]}
      />
      <main className="min-w-0 flex-1 px-7 py-[22px]">
        {error && (
          <Banner
            className="mb-4"
            action={
              <Button variant="secondary" size="sm" onClick={reload}>
                Try again
              </Button>
            }
          >
            {loadErrorText(error)} You are seeing the last list that loaded.
          </Banner>
        )}
        {truncated && (
          <Banner tone="warning" className="mb-4">
            There are more applicants than this screen can load. You see the newest ones. Older cards are not shown yet.
          </Banner>
        )}
        <Toolbar
          filters={filters}
          onFilters={setFilters}
          summary={tab === "table" ? <span aria-live="polite">Rows: {tableRows.length} &middot;</span> : undefined}
          {...sortProps}
        />
        {tab === "board" && (
          <Board applicants={boardCards} allApplicants={applicants} stages={stages} question={question} now={now} filtered={isFiltered} actions={actions} onOpen={open} />
        )}
        {tab === "board" && isFiltered && boardCards.length === 0 && <NoMatches onClear={clearFilters} />}
        {tab === "dnf" &&
          (dnfCards.length > 0 ? (
            <DnfList applicants={dnfCards} stages={stages} question={question} actions={actions} onOpen={open} />
          ) : isFiltered ? (
            <NoMatches onClear={clearFilters} />
          ) : (
            <p className="rounded-xl border border-dashed border-line-strong bg-white px-6 py-14 text-center text-sm font-semibold text-muted">Everyone who started the form finished it.</p>
          ))}
        {tab === "table" &&
          (tableRows.length > 0 ? (
            <ApplicantsTable applicants={tableRows} stages={stages} question={question} now={now} sort={tableSort} onSort={setTableSort} onOpen={open} />
          ) : (
            <NoMatches onClear={clearFilters} />
          ))}
      </main>
      {drawerApplicant && <ApplicantDrawer applicantId={drawerApplicant.id} projectSlug={slug} onClose={close} initialSendChannel={sendChannel} autoPlay={autoPlay} />}
    </AdminShell>
  );
}
