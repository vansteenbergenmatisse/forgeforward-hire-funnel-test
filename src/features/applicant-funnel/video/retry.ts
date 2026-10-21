export const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000];
export const MAX_ATTEMPTS = 5;

export type RetryOptions = {
  attempts?: number;
  delays?: number[];
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (attempt: number, error: unknown) => void;
};

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Runs `task` up to 5 times. Waits 1s, 2s, 4s, 8s between failures. Throws the last error. */
export async function withRetry<T>(task: (attempt: number) => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = opts.attempts ?? MAX_ATTEMPTS;
  const delays = opts.delays ?? BACKOFF_MS;
  const sleep = opts.sleep ?? realSleep;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await task(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      opts.onRetry?.(attempt, error);
      await sleep(delays[Math.min(attempt - 1, delays.length - 1)] ?? 0);
    }
  }
  throw lastError;
}
