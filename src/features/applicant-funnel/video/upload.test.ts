import { describe, expect, it, vi } from "vitest";
import type { FunnelApi } from "../types";

vi.mock("./recording-store", () => ({
  saveTake: vi.fn(async () => {}),
  clearTake: vi.fn(async () => {}),
  loadTake: vi.fn(async () => null),
}));

import { runUpload } from "./run-upload";

const take = { blob: new Blob(["x"], { type: "video/mp4" }), thumb: new Blob(["t"]), mime: "video/mp4", seconds: 31.4, audioOnly: false, retakeUsed: true };

function makeApi() {
  return {
    getUploadUrls: vi.fn(async () => ({ key: "k", putUrl: "mock://v", thumbKey: "tk", thumbPutUrl: "mock://t" })),
    completeVideo: vi.fn(async () => {}),
  } as unknown as FunnelApi & { completeVideo: ReturnType<typeof vi.fn> };
}

describe("runUpload", () => {
  it("retries a failing PUT and completes exactly once", async () => {
    const api = makeApi();
    let n = 0;
    const put = vi.fn(async (url: string) => {
      if (url === "mock://v" && ++n <= 2) throw new Error("drop");
    });
    await runUpload(api, "tok", take, () => {}, { put, retry: { sleep: async () => {} } });
    expect(api.completeVideo).toHaveBeenCalledTimes(1);
    expect(api.completeVideo).toHaveBeenCalledWith(expect.objectContaining({ key: "k", thumbKey: "tk", seconds: 31, retakeUsed: true }));
  });
  it("throws and never completes when all PUT attempts fail", async () => {
    const api = makeApi();
    const put = vi.fn(async () => {
      throw new Error("down");
    });
    await expect(runUpload(api, "tok", take, () => {}, { put, retry: { sleep: async () => {} } })).rejects.toThrow("down");
    expect(api.completeVideo).not.toHaveBeenCalled();
  });
  it("skips the thumbnail for audio only", async () => {
    const api = makeApi();
    const put = vi.fn(async () => {});
    await runUpload(api, "tok", { ...take, audioOnly: true, mime: "audio/mp4" }, () => {}, { put, retry: { sleep: async () => {} } });
    expect(put).toHaveBeenCalledTimes(1);
    expect(api.completeVideo).toHaveBeenCalledWith(expect.objectContaining({ thumbKey: undefined, audioOnly: true }));
  });
});
