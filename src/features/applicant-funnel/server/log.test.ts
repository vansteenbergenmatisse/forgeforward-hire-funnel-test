import { describe, expect, it } from "vitest";
import { logSchema } from "./log";

describe("logSchema", () => {
  it("accepts known event families", () => {
    expect(logSchema.safeParse({ type: "video.recorder_error" }).success).toBe(true);
  });
  it("rejects unknown families and odd characters", () => {
    expect(logSchema.safeParse({ type: "admin.login" }).success).toBe(false);
    expect(logSchema.safeParse({ type: "video.<b>" }).success).toBe(false);
  });
});
