import type { CheckId } from "./types";

/** Typical duration range per check in ms. Uploads are slow, reads are fast. */
const RANGES: Record<CheckId, [number, number]> = {
  db: [30, 90],
  r2: [200, 420],
  applicant: [120, 260],
  upload: [900, 1900],
  "video-complete": [60, 160],
  task: [80, 180],
  "stage-drag": [50, 130],
  webhook: [100, 220],
  "webhook-repeat": [40, 110],
  "messages-dry-run": [150, 320],
  retention: [50, 120],
  backup: [20, 60],
  integrity: [400, 900],
};

/** rng must return a number in [0, 1). Injected so tests are deterministic. */
export function checkDuration(id: CheckId, rng: () => number = Math.random): number {
  const [min, max] = RANGES[id];
  return Math.round(min + (max - min) * rng());
}
