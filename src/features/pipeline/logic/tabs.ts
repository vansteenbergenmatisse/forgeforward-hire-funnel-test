import { ADMIN_BASE_PATH } from "@/features/admin-access";
export type PipelineTab = "board" | "dnf" | "table";

/** `?tab=` value to a tab. Anything unknown is the board. */
export function parseTab(value: string | string[] | undefined): PipelineTab {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "dnf" || v === "table" ? v : "board";
}

/** Path with query for a tab and an optional open applicant. */
export function pipelineHref(slug: string, tab: PipelineTab, applicantId?: string | null, send?: string | null): string {
  const q = new URLSearchParams();
  if (tab !== "board") q.set("tab", tab);
  if (applicantId) q.set("a", applicantId);
  if (applicantId && send) q.set("send", send);
  const s = q.toString();
  return `${ADMIN_BASE_PATH}/p/${slug}${s ? `?${s}` : ""}`;
}
