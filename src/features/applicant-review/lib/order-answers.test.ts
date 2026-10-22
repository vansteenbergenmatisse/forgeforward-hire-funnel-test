import { describe, expect, it } from "vitest";
import { orderAnswers } from "./order-answers";

const ans = (label: string) => ({ label, type: "short_text", value: label });

describe("orderAnswers", () => {
  it("follows question order and puts unknown answers last", () => {
    const out = orderAnswers({ z: ans("Z"), a: ans("A"), old: ans("Old"), m: ans("M") }, ["m", "z", "a"]);
    expect(out.map(([id]) => id)).toEqual(["m", "z", "a", "old"]);
  });
  it("keeps stored order when there are no questions", () => {
    expect(orderAnswers({ b: ans("B"), a: ans("A") }, []).map(([id]) => id)).toEqual(["b", "a"]);
  });
});
