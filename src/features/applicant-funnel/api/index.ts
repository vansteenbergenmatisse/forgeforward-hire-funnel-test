import type { FunnelApi } from "../types";
import { createHttpApi } from "./http-api";
import { createMockApi, type MockSim } from "./mock-api";

/** Picks the API by NEXT_PUBLIC_FUNNEL_API ("http" for real, anything else is mock). */
export function getFunnelApi(sim: MockSim = null): FunnelApi {
  return process.env.NEXT_PUBLIC_FUNNEL_API === "http" ? createHttpApi() : createMockApi(sim);
}

export { FunnelApiError, NETWORK_MESSAGE, SERVER_MESSAGE } from "./errors";
export { parseSim, type MockSim } from "./mock-api";
