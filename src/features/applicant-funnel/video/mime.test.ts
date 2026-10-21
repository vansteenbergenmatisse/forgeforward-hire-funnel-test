import { describe, expect, it } from "vitest";
import { baseMime, extForMime, pickMime } from "./mime";

describe("pickMime", () => {
  it("prefers mp4 with codecs", () => {
    expect(pickMime(() => true)).toBe("video/mp4;codecs=avc1,mp4a");
  });
  it("walks the order", () => {
    expect(pickMime((m) => m === "video/mp4")).toBe("video/mp4");
    expect(pickMime((m) => m.startsWith("video/webm"))).toBe("video/webm;codecs=vp9,opus");
    expect(pickMime((m) => m === "video/webm")).toBe("video/webm");
  });
  it("uses the audio list for audio only", () => {
    expect(pickMime(() => true, true)).toBe("audio/mp4");
    expect(pickMime((m) => m === "audio/webm", true)).toBe("audio/webm");
  });
  it("returns empty when nothing fits or support check throws", () => {
    expect(pickMime(() => false)).toBe("");
    expect(pickMime(() => { throw new Error("x"); })).toBe("");
  });
  it("helpers", () => {
    expect(baseMime("video/webm;codecs=vp9,opus")).toBe("video/webm");
    expect(extForMime("audio/mp4")).toBe("m4a");
    expect(extForMime("video/mp4;codecs=avc1,mp4a")).toBe("mp4");
    expect(extForMime("video/webm")).toBe("webm");
  });
});
