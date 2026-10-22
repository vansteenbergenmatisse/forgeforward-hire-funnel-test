import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectRecordDto } from "../types";

vi.mock("./api", () => ({ adminFetch: vi.fn() }));

import { adminFetch } from "./api";
import { ensureRecordsLoaded, getRecordsState, refreshRecords, resetRecords, setLocalBundle } from "./store";

const fetchMock = vi.mocked(adminFetch);

const dto = (name: string, counts: Record<string, number> = {}): ProjectRecordDto =>
  ({ def: { slug: "demo", name }, questions: [], stages: [], templates: [], stageCounts: counts }) as unknown as ProjectRecordDto;

beforeEach(() => {
  vi.clearAllMocks();
  resetRecords();
  vi.stubGlobal("window", {});
});

describe("refreshRecords", () => {
  it("takes the server copy of a project without unsaved edits", async () => {
    fetchMock.mockResolvedValueOnce([dto("Old")]);
    await ensureRecordsLoaded(true);
    fetchMock.mockResolvedValueOnce([dto("Renamed elsewhere", { a: 2 })]);
    await refreshRecords();
    expect(getRecordsState().records[0].def.name).toBe("Renamed elsewhere");
  });

  it("keeps local edits that are not saved yet but updates the card counts", async () => {
    fetchMock.mockResolvedValueOnce([dto("Old")]);
    await ensureRecordsLoaded(true);
    const rec = getRecordsState().records[0];
    setLocalBundle("demo", { def: { ...rec.def, name: "Typing" }, questions: [], stages: [], templates: [] });
    fetchMock.mockResolvedValueOnce([dto("Server", { a: 5 })]);
    await refreshRecords();
    const now = getRecordsState().records[0];
    expect(now.def.name).toBe("Typing");
    expect(now.stageCounts).toEqual({ a: 5 });
  });

  it("stays quiet when the request fails", async () => {
    fetchMock.mockResolvedValueOnce([dto("Old")]);
    await ensureRecordsLoaded(true);
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await refreshRecords();
    expect(getRecordsState().records[0].def.name).toBe("Old");
  });
});
