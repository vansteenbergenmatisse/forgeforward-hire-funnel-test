import { describe, expect, it } from "vitest";
import { taskBodyText, validateTask } from "./task";

const ok = { taskTitle: "T", taskBody: "<p>Do it</p>", taskAllowText: true, taskAllowLink: false, taskAllowFile: false };

describe("taskBodyText", () => {
  it("strips tags and spaces", () => expect(taskBodyText("<p>Hi&nbsp;<strong>there</strong></p><p></p>")).toBe("Hi there"));
  it("treats an image as content", () => expect(taskBodyText('<p><img src="https://x.co/a.png"></p>')).not.toBe(""));
  it("treats an empty paragraph as empty", () => expect(taskBodyText("<p></p>")).toBe(""));
});

describe("validateTask", () => {
  it("passes a valid task", () => expect(validateTask(ok)).toEqual({}));
  it("flags title, body and answers", () => {
    const e = validateTask({ ...ok, taskTitle: " ", taskBody: "<p></p>", taskAllowText: false });
    expect(Object.keys(e).sort()).toEqual(["answers", "body", "title"]);
  });
});
