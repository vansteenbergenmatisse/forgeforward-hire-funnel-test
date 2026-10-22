import { describe, expect, it } from "vitest";
import { pickByEmail } from "./booking";
import { strayApplicantKeys } from "./commands";

const ID = "3f2c1c9e-6a53-4a0b-9d0e-1a2b3c4d5e6f";
const row = (over: Partial<{ videoKey: string | null; thumbKey: string | null; taskFileKey: string | null }> = {}) => ({
  videoKey: `videos/p/${ID}/2.webm`,
  thumbKey: `thumbs/p/${ID}/2.jpg`,
  taskFileKey: null,
  ...over,
});

describe("strayApplicantKeys", () => {
  it("finds earlier takes in the applicant's own folders, not the keys already known", async () => {
    const seen: string[] = [];
    const list = async (prefix: string) => {
      seen.push(prefix);
      return prefix.startsWith("videos") ? [`videos/p/${ID}/1.webm`, `videos/p/${ID}/2.webm`] : [`thumbs/p/${ID}/2.jpg`];
    };
    expect(await strayApplicantKeys(ID, row(), list)).toEqual([`videos/p/${ID}/1.webm`]);
    expect(seen).toEqual([`videos/p/${ID}/`, `thumbs/p/${ID}/`]);
  });
  it("never lists a folder that is not named after the applicant", async () => {
    const list = async () => {
      throw new Error("must not list");
    };
    expect(await strayApplicantKeys(ID, row({ videoKey: "videos/shared/2.webm", thumbKey: null }), list)).toEqual([]);
  });
});

describe("pickByEmail", () => {
  it("takes the newest applicant when all matches are in one project", () => {
    expect(pickByEmail([{ id: "new", projectId: "p1" }, { id: "old", projectId: "p1" }])).toBe("new");
  });
  it("leaves the booking unmatched when the email applied to several projects", () => {
    expect(pickByEmail([{ id: "a", projectId: "p1" }, { id: "b", projectId: "p2" }])).toBeNull();
  });
  it("returns null with no match", () => {
    expect(pickByEmail([])).toBeNull();
  });
});
