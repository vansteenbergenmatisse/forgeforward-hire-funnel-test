import { describe, expect, it } from "vitest";
import { parseTab, pipelineHref } from "./tabs";

describe("tabs", () => {
  it("parses the tab", () => {
    expect(parseTab("dnf")).toBe("dnf");
    expect(parseTab(["table", "x"])).toBe("table");
    expect(parseTab("nope")).toBe("board");
    expect(parseTab(undefined)).toBe("board");
  });
  it("builds hrefs", () => {
    expect(pipelineHref("p", "board")).toBe("/adminMatt/p/p");
    expect(pipelineHref("p", "table", "a1")).toBe("/adminMatt/p/p?tab=table&a=a1");
    expect(pipelineHref("p", "board", null, "email")).toBe("/adminMatt/p/p");
    expect(pipelineHref("p", "board", "a1", "email")).toBe("/adminMatt/p/p?a=a1&send=email");
  });
});
