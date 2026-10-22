import { describe, expect, it } from "vitest";
import { chooseDatabaseUrl, hostOf, needsTls } from "./url";

describe("chooseDatabaseUrl", () => {
  it("prefers APP_DATABASE_URL and names the source", () => {
    expect(chooseDatabaseUrl({ APP_DATABASE_URL: "postgres://a", DATABASE_URL: "postgres://b" })).toEqual({
      url: "postgres://a",
      source: "APP_DATABASE_URL",
    });
  });
  it("falls back to DATABASE_URL, then null", () => {
    expect(chooseDatabaseUrl({ DATABASE_URL: "postgres://b" })?.source).toBe("DATABASE_URL");
    expect(chooseDatabaseUrl({ APP_DATABASE_URL: "" })).toBeNull();
  });
});

describe("needsTls", () => {
  it("requires TLS for remote hosts and skips local ones", () => {
    expect(needsTls("postgres://u:p@ep-x.neon.tech/db")).toBe(true);
    expect(needsTls("postgres://u:p@localhost:5432/db")).toBe(false);
    expect(needsTls("postgres://u:p@ep-x.neon.tech/db?sslmode=disable")).toBe(false);
    expect(needsTls("not a url")).toBe(true);
  });
});

describe("hostOf", () => {
  it("never leaks credentials", () => {
    expect(hostOf("postgres://user:secret@ep-x.neon.tech/db")).toBe("ep-x.neon.tech");
  });
});
