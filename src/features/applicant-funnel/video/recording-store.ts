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

export async function saveTake(resumeToken: string, take: Take): Promise<void> {
  try {
    await set(keyFor(resumeToken), take);
  } catch {
    // private mode or full storage: the upload still works from memory
  }
}

export async function loadTake(resumeToken: string): Promise<Take | null> {
  try {
    return (await get<Take>(keyFor(resumeToken))) ?? null;
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
