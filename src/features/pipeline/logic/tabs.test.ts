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
    expect(pipelineHref("p", "board")).toBe("/admin/p/p");
    expect(pipelineHref("p", "table", "a1")).toBe("/admin/p/p?tab=table&a=a1");
    expect(pipelineHref("p", "board", null, "email")).toBe("/admin/p/p");
    expect(pipelineHref("p", "board", "a1", "email")).toBe("/admin/p/p?a=a1&send=email");
  });
});
