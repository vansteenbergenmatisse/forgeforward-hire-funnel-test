export type VideoSettings = { prepSeconds: number; maxRecordSeconds: number; retakesAllowed: number };
export type VideoErrors = Partial<Record<keyof VideoSettings, string>>;

export const VIDEO_LIMITS = {
  prepSeconds: { min: 0, max: 300 },
  maxRecordSeconds: { min: 15, max: 180 },
  retakesAllowed: { min: 0, max: 5 },
} as const;

const LABELS: Record<keyof VideoSettings, string> = {
  prepSeconds: "Prep time",
  maxRecordSeconds: "Max recording",
  retakesAllowed: "Retakes",
};

export function validateVideo(v: VideoSettings): VideoErrors {
  const errors: VideoErrors = {};
  for (const key of Object.keys(VIDEO_LIMITS) as (keyof VideoSettings)[]) {
    const { min, max } = VIDEO_LIMITS[key];
    const n = v[key];
    if (!Number.isInteger(n)) errors[key] = `${LABELS[key]} must be a whole number.`;
    else if (n < min || n > max) errors[key] = `${LABELS[key]} must be between ${min} and ${max}.`;
  }
  return errors;
}

/** Rough upload size at the funnel's 1.2 Mbps recording rate, in MB. */
export function estimateMegabytes(seconds: number): number {
  return Math.round(((seconds * 1.2) / 8) * 10) / 10;
}
