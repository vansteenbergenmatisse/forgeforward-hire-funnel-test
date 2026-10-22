import { describe, expect, it } from "vitest";
import { errorFromResponse, INVALID_MESSAGE, SERVER_MESSAGE } from "./errors";

describe("errorFromResponse", () => {
  it("passes the rate limit message through", () => {
    const e = errorFromResponse(429, { error: "rate_limited", message: "Too many tries. Wait a few minutes and try again." });
    expect(e.message).toBe("Too many tries. Wait a few minutes and try again.");
    expect(e.code).toBe("rate_limited");
    expect(e.status).toBe(429);
  });
  it("passes the closed role message through", () => {
    expect(errorFromResponse(403, { error: "closed", message: "Applications for this role are closed." }).message).toBe("Applications for this role are closed.");
  });
  it("keeps field errors for the form", () => {
    const e = errorFromResponse(400, { error: "invalid", message: "Invalid input", fields: { "q:1": "Check this answer", bad: 5 } });
    expect(e.fields).toEqual({ "q:1": "Check this answer" });
  });
  it("uses a plain message for a bare invalid code", () => {
    expect(errorFromResponse(400, { error: "invalid" }).message).toBe(INVALID_MESSAGE);
  });
  it("hides server errors behind the generic message", () => {
    expect(errorFromResponse(500, { error: "server_error" }).message).toBe(SERVER_MESSAGE);
    expect(errorFromResponse(500, { message: "db password wrong" }).message).toBe(SERVER_MESSAGE);
    expect(errorFromResponse(404, null).message).toBe(SERVER_MESSAGE);
  });
});
