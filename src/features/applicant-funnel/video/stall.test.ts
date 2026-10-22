import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadWithProgress } from "./upload";

class FakeXhr {
  static last: FakeXhr;
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  status = 200;
  aborted = false;
  constructor() {
    FakeXhr.last = this;
  }
  open() {}
  setRequestHeader() {}
  send() {}
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("uploadWithProgress stall watchdog", () => {
  it("rejects and aborts when no progress arrives", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const p = uploadWithProgress("https://r2.example/put", new Blob(["x"]), "video/mp4", () => {}, 1000);
    const assertion = expect(p).rejects.toThrow("stalled");
    await vi.advanceTimersByTimeAsync(1001);
    await assertion;
    expect(FakeXhr.last.aborted).toBe(true);
  });
  it("keeps going while progress arrives, then resolves", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const seen: number[] = [];
    const p = uploadWithProgress("https://r2.example/put", new Blob(["x"]), "video/mp4", (f) => seen.push(f), 1000);
    await vi.advanceTimersByTimeAsync(800);
    FakeXhr.last.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 2 });
    await vi.advanceTimersByTimeAsync(800);
    FakeXhr.last.onload?.();
    await expect(p).resolves.toBeUndefined();
    expect(seen).toEqual([0.5, 1]);
    expect(FakeXhr.last.aborted).toBe(false);
  });
});
