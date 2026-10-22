import { describe, expect, it } from "vitest";
import { isValidUrl, taskFileMime, validateTask } from "./task-validation";

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
    const big = { name: "a.pdf", type: "application/pdf", size: 26 * 1024 * 1024 } as File;
    expect(validateTask({ text: "", link: "", file: big }, { ...allow, file: true }).file).toBeTruthy();
  });
  it("rejects file types the server does not take", () => {
    const withFile = (name: string, type = "") => validateTask({ text: "", link: "", file: { name, type, size: 10 } as File }, { ...allow, file: true });
    expect(withFile("deck.pptx").file).toBeTruthy();
    expect(withFile("photo.heic", "image/heic").file).toBeTruthy();
    expect(withFile("archive.zip").file).toBeTruthy();
    expect(withFile("cv.PDF", "application/pdf")).toEqual({});
    expect(withFile("notes.txt")).toEqual({});
  });
  it("derives the mime from the extension when the browser gives none", () => {
    expect(taskFileMime({ name: "cv.docx", type: "" })).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(taskFileMime({ name: "a.jpeg", type: "" })).toBe("image/jpeg");
    expect(taskFileMime({ name: "a.bin", type: "application/octet-stream" })).toBeNull();
  });
});
