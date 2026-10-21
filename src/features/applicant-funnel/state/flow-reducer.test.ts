import { describe, expect, it } from "vitest";
import { flowReducer, initialFlowState, progressIndex, type FlowState } from "./flow-reducer";

const session = { applicantId: "a", resumeToken: "t" };
const at = (step: FlowState["step"]): FlowState => ({ ...initialFlowState, step, session });

describe("flowReducer", () => {
  it("walks the happy path", () => {
    let s = flowReducer(at("form"), { type: "formDone", session, firstName: "Sam" });
    expect(s.step).toBe("video");
    s = flowReducer(s, { type: "videoDone", taskEnabled: true });
    expect(s.step).toBe("task");
    s = flowReducer(s, { type: "taskDone" });
    expect(s.step).toBe("done");
  });
  it("skips the task when it is off", () => {
    expect(flowReducer(at("video"), { type: "videoDone", taskEnabled: false }).step).toBe("done");
  });
  it("ignores actions from the wrong step", () => {
    expect(flowReducer(at("form"), { type: "taskDone" }).step).toBe("form");
    expect(flowReducer(at("done"), { type: "formDone", session, firstName: "x" }).step).toBe("done");
  });
  it("leaves the in-app screen", () => {
    expect(flowReducer(at("inapp"), { type: "continueAnyway" }).step).toBe("form");
  });
  it("maps progress", () => {
    expect([progressIndex("inapp"), progressIndex("form"), progressIndex("video"), progressIndex("task"), progressIndex("done")]).toEqual([1, 1, 2, 3, 4]);
  });
});
