import { describe, expect, it } from "vitest";
import { ApiError } from "./errors";
import { assertKnownVariables } from "./template-variables";

function failure(subject: string, body: string): ApiError | null {
  try {
    assertKnownVariables(subject, body);
    return null;
  } catch (e) {
    return e as ApiError;
  }
}

describe("assertKnownVariables", () => {
  it("accepts known variables and plain text", () => {
    expect(failure("Hi {first_name}", "See {cal_link} for {project_name}, {last_name}.")).toBeNull();
    expect(failure("", "No variables here")).toBeNull();
  });

  it("answers 400 and names every unknown variable once", () => {
    const e = failure("Hi {nick_name}", "Hello {first_name}, {bogus} and {bogus} {nick_name}");
    expect(e).toBeInstanceOf(ApiError);
    expect(e?.status).toBe(400);
    expect(e?.code).toBe("unknown_variables");
    expect(e?.message).toContain("{nick_name}");
    expect(e?.message).toContain("{bogus}");
    expect(e?.message).not.toContain("{first_name}");
    expect(e?.message.match(/\{bogus\}/g)).toHaveLength(1);
  });
});
