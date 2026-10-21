export const DEV_STEPS = ["A01", "A02", "A03", "A14", "A15", "A16", "A04", "A05", "A06", "A07", "A08", "A09", "A10", "A11", "A12", "A13"] as const;
export type DevStep = (typeof DEV_STEPS)[number];

/** Reads the ?step= review param. Callers must only use it outside production. */
export function parseDevStep(value: string | string[] | undefined): DevStep | null {
  const v = (Array.isArray(value) ? value[0] : value)?.toUpperCase();
  return DEV_STEPS.find((s) => s === v) ?? null;
}
