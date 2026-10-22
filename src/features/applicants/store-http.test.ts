import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicantView } from "./types";

vi.mock("./api-client", async () => {
  const actual = await vi.importActual<typeof import("./api-client")>("./api-client");
  return {
    ...actual,
    applicantsApi: { list: vi.fn(), get: vi.fn(), setScore: vi.fn(), setNotes: vi.fn(), remove: vi.fn(), moveToStage: vi.fn(), markRead: vi.fn(), linkBooking: vi.fn() },
  };
});

import { ApplicantsApiError, applicantsApi } from "./api-client";
import { deleteFailureText, getHttpMeta, getHttpSnapshot, httpActions, keepLoadedDetail, reloadApplicants, resetHttpStore } from "./store-http";

const api = vi.mocked(applicantsApi);
const card = (id: string, score: number | null = null) => ({ id, score, notes: "", projectSlug: "p", stageId: "s1", unreadReply: false, events: [], messages: [] }) as unknown as ApplicantView;

const page = (applicants: ApplicantView[], truncated = false) => ({ applicants, truncated });

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetHttpStore();
});

describe("http applicants store ordering", () => {
  it("ignores a list that was requested before a local change", async () => {
    const list = deferred<ReturnType<typeof page>>();
    api.list.mockReturnValueOnce(list.promise);
    api.list.mockResolvedValue(page([card("a", 4)]));
    api.setScore.mockResolvedValue(card("a", 4));
    const poll = reloadApplicants();
    // Local state is empty here, so seed it through a first successful load.
    list.resolve(page([card("a", 1)]));
    await poll;
    expect(getHttpSnapshot()[0].score).toBe(1);

    const stale = deferred<ReturnType<typeof page>>();
    api.list.mockReturnValueOnce(stale.promise);
    const p2 = reloadApplicants();
    const saved = httpActions.setScore("a", 4);
    stale.resolve(page([card("a", 1)]));
    await p2;
    expect(getHttpSnapshot()[0].score).toBe(4);
    await saved;
  });

  it("sends changes to one applicant in order and keeps the newest answer", async () => {
    api.list.mockResolvedValue(page([card("a", null)]));
    await reloadApplicants();
    const first = deferred<ApplicantView>();
    const order: number[] = [];
    api.setScore.mockImplementation((_id, score) => {
      order.push(score as number);
      return score === 3 ? first.promise : Promise.resolve(card("a", score));
    });
    httpActions.setScore("a", 3);
    httpActions.setScore("a", 4);
    expect(getHttpSnapshot()[0].score).toBe(4);
    await Promise.resolve();
    expect(order).toEqual([3]);
    first.resolve(card("a", 3));
    await vi.waitFor(() => expect(order).toEqual([3, 4]));
    await vi.waitFor(() => expect(getHttpSnapshot()[0].score).toBe(4));
  });

  it("reports a failed note save", async () => {
    api.list.mockResolvedValue(page([card("a")]));
    await reloadApplicants();
    api.setNotes.mockRejectedValue(new ApplicantsApiError(400, "invalid_body", "bad"));
    expect(await httpActions.setNotes("a", "x")).toBe(false);
  });

  it("keeps the card when a delete fails", async () => {
    api.list.mockResolvedValue(page([card("a")]));
    await reloadApplicants();
    api.remove.mockRejectedValue(new ApplicantsApiError(502, "files_failed", "x"));
    const msg = await httpActions.remove("a");
    expect(msg).toMatch(/nothing was removed/i);
    expect(getHttpSnapshot()).toHaveLength(1);
  });

  it("removes the card once the server confirms", async () => {
    api.list.mockResolvedValue(page([card("a")]));
    await reloadApplicants();
    api.remove.mockResolvedValue({ ok: true });
    expect(await httpActions.remove("a")).toBeNull();
    expect(getHttpSnapshot()).toHaveLength(0);
  });
});

describe("deleteFailureText", () => {
  it("names the cause", () => {
    expect(deleteFailureText(new ApplicantsApiError(0, "network", "x"))).toMatch(/reach the server/);
    expect(deleteFailureText(new ApplicantsApiError(404, "error", "x"))).toMatch(/session/);
  });
});

describe("list rows and detail", () => {
  const row = (id: string, over: Partial<ApplicantView> = {}) => ({ ...card(id), ...over }) as ApplicantView;

  it("keeps timeline and messages that were already loaded when a light list arrives", () => {
    const full = row("a", { detail: true, events: [{ id: "e1", type: "stage_changed", at: "2026-01-01T00:00:00Z" }] });
    const light = row("a", { detail: false, events: [] });
    const out = keepLoadedDetail([full], [light, row("b", { detail: false })]);
    expect(out[0].events).toHaveLength(1);
    expect(out[0].detail).toBe(true);
    expect(out[1].detail).toBe(false);
  });

  it("loadDetail replaces the row with the full one", async () => {
    api.list.mockResolvedValue(page([row("a", { detail: false })]));
    await reloadApplicants();
    api.get.mockResolvedValue(row("a", { detail: true, events: [{ id: "e1", type: "x", at: "2026-01-01T00:00:00Z" }] }));
    await httpActions.loadDetail("a");
    expect(getHttpSnapshot()[0].events).toHaveLength(1);
  });

  it("remembers that the server list was cut off", async () => {
    api.list.mockResolvedValue(page([card("a")], true));
    await reloadApplicants();
    expect(getHttpSnapshot()).toHaveLength(1);
    expect(getHttpMeta().truncated).toBe(true);
  });
});
