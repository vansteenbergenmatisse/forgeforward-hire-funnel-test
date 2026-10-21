import { describe, expect, it } from "vitest";
import { isValidUrl, validateTask } from "./task-validation";

const allow = { text: true, link: true, file: false };

describe("task validation", () => {
  it("needs one answer", () => {
    expect(validateTask({ text: " ", link: "", file: null }, allow).form).toBeTruthy();
    expect(validateTask({ text: "hi", link: "", file: null }, allow)).toEqual({});
  });
  it("checks links", () => {
    expect(isValidUrl("https://example.com/x")).toBe(true);
    expect(isValidUrl("example")).toBe(false);
    expect(validateTask({ text: "", link: "nope", file: null }, allow).link).toBeTruthy();
  });
  it("caps text and files", () => {
    expect(validateTask({ text: "a".repeat(5001), link: "", file: null }, allow).text).toBeTruthy();
    const big = { size: 26 * 1024 * 1024 } as File;
    expect(validateTask({ text: "", link: "", file: big }, { ...allow, file: true }).file).toBeTruthy();
  });
});
