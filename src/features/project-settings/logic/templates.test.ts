import { describe, expect, it } from "vitest";
import { MOCK_TEMPLATES } from "@/features/projects";
import { extractVariables, insertAtCursor, SAMPLE_APPLICANT, suggestWaVariables, unknownVariables, validateTemplate, variablesWithoutSample } from "./templates";

describe("variables", () => {
  it("extracts in order without duplicates", () => expect(extractVariables("{a_b} x {first_name} {a_b}")).toEqual(["a_b", "first_name"]));
  it("finds unknown ones", () => expect(unknownVariables("Hi {first_name} {nickname}")).toEqual(["nickname"]));
  it("finds variables the sample cannot fill", () => expect(variablesWithoutSample("{first_name} {x}", SAMPLE_APPLICANT)).toEqual(["x"]));
  it("suggests WhatsApp order", () => expect(suggestWaVariables("{cal_link} {first_name} {oops}")).toEqual(["cal_link", "first_name"]));
});

describe("insertAtCursor", () => {
  it("inserts at the caret", () => expect(insertAtCursor("Hi , ok", "{first_name}", 3, 3)).toEqual({ text: "Hi {first_name}, ok", caret: 15 }));
  it("replaces a selection", () => expect(insertAtCursor("Hi NAME", "{first_name}", 3, 7).text).toBe("Hi {first_name}"));
  it("clamps bad positions", () => expect(insertAtCursor("ab", "X", 9, 12).text).toBe("abX"));
});

describe("validateTemplate", () => {
  const email = MOCK_TEMPLATES.find((t) => t.channel === "email")!;
  const wa = MOCK_TEMPLATES.find((t) => t.channel === "whatsapp")!;
  it("accepts the defaults", () => {
    expect(validateTemplate(email)).toEqual({});
    expect(validateTemplate(wa)).toEqual({});
  });
  it("needs a subject for email only", () => {
    expect(validateTemplate({ ...email, subject: "" }).subject).toBeDefined();
    expect(validateTemplate({ ...MOCK_TEMPLATES[1], subject: "" }).subject).toBeUndefined();
  });
  it("flags an empty name, an empty body and unknown variables", () => {
    expect(validateTemplate({ ...email, name: " " }).name).toBeDefined();
    expect(validateTemplate({ ...email, body: "" }).body).toBeDefined();
    expect(validateTemplate({ ...email, body: "Hi {nick}" }).body).toMatch(/nick/);
  });
  it("checks WhatsApp fields", () => {
    expect(validateTemplate({ ...wa, waTemplateName: "Bad Name" }).waTemplateName).toBeDefined();
    expect(validateTemplate({ ...wa, waLanguage: "" }).waLanguage).toBeDefined();
    expect(validateTemplate({ ...wa, waVariables: ["nope"] }).waVariables).toBeDefined();
  });
});

import { moveItem, newTemplate, previewText, uniqueTemplateName } from "./templates";

describe("previewText", () => {
  it("fills known variables and lists the missing ones", () => {
    const r = previewText("Hi {first_name} {nick}", SAMPLE_APPLICANT);
    expect(r.text).toBe("Hi Sam {nick}");
    expect(r.missing).toEqual(["nick"]);
  });
  it("has nothing missing when all are known", () => expect(previewText("{cal_link}", SAMPLE_APPLICANT).missing).toEqual([]));
});

describe("new templates", () => {
  it("makes unique names per channel", () => {
    expect(uniqueTemplateName(MOCK_TEMPLATES, "email", "Interview invite")).toBe("Interview invite 2");
    expect(uniqueTemplateName(MOCK_TEMPLATES, "sms")).toBe("New template");
  });
  it("seeds WhatsApp fields only for WhatsApp", () => {
    expect(newTemplate("whatsapp", "x", []).waLanguage).toBe("en");
    expect(newTemplate("sms", "x", []).waLanguage).toBeUndefined();
  });
});

describe("moveItem", () => {
  it("moves within bounds and ignores out of range", () => {
    expect(moveItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 2, 3)).toEqual([1, 2, 3]);
  });
});
