import { describe, expect, it, vi } from "vitest";
import type { FunnelApi } from "../types";

vi.mock("./recording-store", () => ({
  saveTake: vi.fn(async () => {}),
  clearTake: vi.fn(async () => {}),
  loadTake: vi.fn(async () => null),
}));

import { resetIssuedUrls, runUpload, URL_REUSE_MS } from "./run-upload";

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

describe("runUpload url reuse", () => {
  it("reuses signed urls for the same take on a manual retry, then asks again after they age", async () => {
    resetIssuedUrls();
    const api = makeApi();
    const failing = vi.fn(async () => {
      throw new Error("down");
    });
    let t = 1_000;
    const deps = { retry: { sleep: async () => {} }, now: () => t };
    await expect(runUpload(api, "tok-r", take, () => {}, { ...deps, put: failing })).rejects.toThrow("down");
    await expect(runUpload(api, "tok-r", take, () => {}, { ...deps, put: failing })).rejects.toThrow("down");
    expect(api.getUploadUrls).toHaveBeenCalledTimes(1);
    t += URL_REUSE_MS + 1;
    await runUpload(api, "tok-r", take, () => {}, { ...deps, put: vi.fn(async () => {}) });
    expect(api.getUploadUrls).toHaveBeenCalledTimes(2);
    expect(api.getUploadUrls).toHaveBeenCalledWith(expect.objectContaining({ bytes: take.blob.size }));
  });
  it("asks again when the take changed", async () => {
    resetIssuedUrls();
    const api = makeApi();
    const put = vi.fn(async () => {
      throw new Error("down");
    });
    const deps = { retry: { sleep: async () => {} }, put };
    await expect(runUpload(api, "tok-c", take, () => {}, deps)).rejects.toThrow();
    await expect(runUpload(api, "tok-c", { ...take, blob: new Blob(["xyz"], { type: "video/mp4" }) }, () => {}, deps)).rejects.toThrow();
    expect(api.getUploadUrls).toHaveBeenCalledTimes(2);
  });
});
