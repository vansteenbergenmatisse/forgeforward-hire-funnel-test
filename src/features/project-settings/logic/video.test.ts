import { describe, expect, it } from "vitest";
import { estimateMegabytes, validateVideo } from "./video";

describe("validateVideo", () => {
  it("accepts the defaults", () => expect(validateVideo({ prepSeconds: 60, maxRecordSeconds: 60, retakesAllowed: 1 })).toEqual({}));
  it("flags out-of-range and fractional values", () => {
    const e = validateVideo({ prepSeconds: 301, maxRecordSeconds: 5, retakesAllowed: 1.5 });
    expect(Object.keys(e).sort()).toEqual(["maxRecordSeconds", "prepSeconds", "retakesAllowed"]);
  });
  it("allows zero prep and zero retakes", () => expect(validateVideo({ prepSeconds: 0, maxRecordSeconds: 60, retakesAllowed: 0 })).toEqual({}));
});

describe("estimateMegabytes", () => {
  it("is about 9 MB for 60 seconds", () => expect(estimateMegabytes(60)).toBe(9));
});
