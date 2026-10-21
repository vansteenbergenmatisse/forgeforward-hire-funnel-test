import { describe, expect, it, vi } from "vitest";
import { withRetry } from "./retry";

describe("withRetry", () => {
  it("returns on first success without sleeping", async () => {
    const sleep = vi.fn(async () => {});
    expect(await withRetry(async () => "ok", { sleep })).toBe("ok");
    expect(sleep).not.toHaveBeenCalled();
  });
  it("backs off 1s, 2s, 4s, 8s and succeeds on the fifth try", async () => {
    const waits: number[] = [];
    let n = 0;
    const result = await withRetry(
      async () => {
        n++;
        if (n < 5) throw new Error("no");
        return n;
      },
      { sleep: async (ms) => void waits.push(ms) },
    );
    expect(result).toBe(5);
    expect(waits).toEqual([1000, 2000, 4000, 8000]);
  });
  it("gives up after 5 attempts and throws the last error", async () => {
    const task = vi.fn(async () => {
      throw new Error("boom");
    });
    await expect(withRetry(task, { sleep: async () => {} })).rejects.toThrow("boom");
    expect(task).toHaveBeenCalledTimes(5);
  });
});
