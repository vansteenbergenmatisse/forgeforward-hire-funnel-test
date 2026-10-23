import { describe, expect, it } from "vitest";
import { deleteProjectBody, statusBody } from "./schemas";

describe("lifecycle request bodies", () => {
  it("accepts only open or closed as a status (never deleting)", () => {
    expect(statusBody.safeParse({ status: "closed" }).success).toBe(true);
    expect(statusBody.safeParse({ status: "open" }).success).toBe(true);
    expect(statusBody.safeParse({ status: "deleting" }).success).toBe(false);
    expect(statusBody.safeParse({ status: "open", extra: 1 }).success).toBe(false);
  });
  it("needs the slug repeated to delete", () => {
    expect(deleteProjectBody.safeParse({ confirmSlug: "sales-rep" }).success).toBe(true);
    expect(deleteProjectBody.safeParse({}).success).toBe(false);
    expect(deleteProjectBody.safeParse({ confirmSlug: "Bad Slug" }).success).toBe(false);
  });
});
