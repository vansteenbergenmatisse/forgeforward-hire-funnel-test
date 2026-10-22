import type { ProjectBundle, ProjectDef } from "@/features/projects";
import type { SyncEntity } from "./sync-plan";

/** Browsers refuse a keepalive request whose body is over 64 KiB. Leave room for the headers. */
export const KEEPALIVE_MAX_BYTES = 60_000;

export function fitsKeepalive(body: unknown): boolean {
  if (body === undefined) return true;
  return new TextEncoder().encode(JSON.stringify(body)).length <= KEEPALIVE_MAX_BYTES;
}

/** True when sending the same request again cannot help: the server understood it and said no. */
export function isRefusal(status: number): boolean {
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

const LIST = { stage: "stages", question: "questions", template: "templates" } as const;

/**
 * The server refused one change. Puts that part of the local copy back to what the server holds and leaves every other
 * pending edit alone, so the screen shows the truth and the remaining edits still save.
 */
export function reconcileRefused(local: ProjectBundle, server: ProjectBundle, entity: SyncEntity): ProjectBundle {
  if (entity.kind === "project") {
    const def = { ...local.def } as Record<string, unknown>;
    for (const f of entity.fields) def[f] = (server.def as Record<string, unknown>)[f];
    return { ...local, def: def as ProjectDef };
  }
  if (entity.kind === "order") {
    const list = local[entity.list] as { id: string }[];
    const rank = new Map((server[entity.list] as { id: string }[]).map((x, i) => [x.id, i]));
    const known = list.filter((x) => rank.has(x.id)).sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
    const extra = list.filter((x) => !rank.has(x.id));
    return { ...local, [entity.list]: [...known, ...extra] } as ProjectBundle;
  }
  const key = LIST[entity.kind];
  const localList = local[key] as { id: string }[];
  const serverList = server[key] as { id: string }[];
  const serverItem = serverList.find((x) => x.id === entity.id);
  const at = localList.findIndex((x) => x.id === entity.id);
  let next: { id: string }[];
  if (!serverItem) next = localList.filter((x) => x.id !== entity.id);
  else if (at >= 0) next = localList.map((x) => (x.id === entity.id ? serverItem : x));
  else {
    next = [...localList];
    next.splice(Math.min(serverList.indexOf(serverItem), next.length), 0, serverItem);
  }
  return { ...local, [key]: next } as ProjectBundle;
}
