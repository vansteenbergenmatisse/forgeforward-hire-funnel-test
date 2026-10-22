import { del, get, set } from "idb-keyval";

/** A finished take. Held in IndexedDB until the server confirms the upload. */
export type Take = {
  blob: Blob;
  thumb: Blob | null;
  mime: string;
  seconds: number;
  audioOnly: boolean;
  retakeUsed: boolean;
};

const keyFor = (resumeToken: string) => `forge-video:${resumeToken}`;

/** A saved take older than this is dropped: the person gave up, and the recording is private data. */
export const TAKE_TTL_MS = 48 * 60 * 60_000;

type StoredTake = Take & { savedAt?: number };

export function isStale(savedAt: number | undefined, now = Date.now()): boolean {
  return typeof savedAt !== "number" || now - savedAt > TAKE_TTL_MS;
}

export async function saveTake(resumeToken: string, take: Take): Promise<void> {
  try {
    await set(keyFor(resumeToken), { ...take, savedAt: Date.now() } satisfies StoredTake);
  } catch {
    // private mode or full storage: the upload still works from memory
  }
}

export async function loadTake(resumeToken: string): Promise<Take | null> {
  try {
    const stored = await get<StoredTake>(keyFor(resumeToken));
    if (!stored) return null;
    if (isStale(stored.savedAt)) {
      await clearTake(resumeToken);
      return null;
    }
    const { savedAt: _savedAt, ...take } = stored;
    void _savedAt;
    return take;
  } catch {
    return null;
  }
}

export async function clearTake(resumeToken: string): Promise<void> {
  try {
    await del(keyFor(resumeToken));
  } catch {
    // nothing to clear
  }
}
