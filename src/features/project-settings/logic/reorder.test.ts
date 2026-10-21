import { describe, expect, it } from "vitest";
import { moveById } from "./reorder";

const list = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("moveById", () => {
  it("moves down", () => expect(moveById(list, "a", "c").map((i) => i.id)).toEqual(["b", "c", "a"]));
  it("moves up", () => expect(moveById(list, "c", "a").map((i) => i.id)).toEqual(["c", "a", "b"]));
  it("ignores unknown ids and same position", () => {
    expect(moveById(list, "a", "zzz")).toEqual(list);
    expect(moveById(list, "b", "b")).toEqual(list);
  });
  it("does not mutate the input", () => {
    moveById(list, "a", "c");
    expect(list.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});
