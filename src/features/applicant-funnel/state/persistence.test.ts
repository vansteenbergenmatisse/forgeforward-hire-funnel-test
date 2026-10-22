import { describe, expect, it } from "vitest";
import { DONE_TTL_MS, isDoneExpired, stepForServerProgress } from "./persistence";

describe("stepForServerProgress", () => {
  it("maps where the server says the applicant stands", () => {
    expect(stepForServerProgress("form_done", true)).toBe("video");
    expect(stepForServerProgress("video_done", true)).toBe("task");
    expect(stepForServerProgress("video_done", false)).toBe("done");
    expect(stepForServerProgress("completed", true)).toBe("done");
    expect(stepForServerProgress(undefined, true)).toBe("video");
  });
});

describe("isDoneExpired", () => {
  it("keeps the thank you page for a day", () => {
    const now = 1_000_000_000;
    expect(isDoneExpired(now - 1000, now)).toBe(false);
    expect(isDoneExpired(now - DONE_TTL_MS - 1, now)).toBe(true);
    expect(isDoneExpired(undefined, now)).toBe(true);
  });
});
