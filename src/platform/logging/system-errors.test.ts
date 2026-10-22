import { describe, expect, it } from "vitest";
import { cleanMessage, cleanSource } from "./system-errors";

describe("cleanSource", () => {
  it("keeps a safe label and caps the length", () => {
    expect(cleanSource("Client:Video Upload")).toBe("client:video_upload");
    expect(cleanSource("x".repeat(200))).toHaveLength(64);
    expect(cleanSource("###")).toBe("_");
    expect(cleanSource("")).toBe("unknown");
  });
});

describe("cleanMessage", () => {
  it("flattens line breaks and control characters", () => {
    expect(cleanMessage("Backup restored OK\n\u0000second line")).toBe("Backup restored OK second line");
  });
  it("caps the length and never returns empty", () => {
    expect(cleanMessage("a".repeat(1000))).toHaveLength(300);
    expect(cleanMessage("   ")).toBe("(empty)");
  });
});
