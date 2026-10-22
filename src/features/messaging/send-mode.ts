import type { Channel } from "@/features/projects";

export type SendMode = "api" | "link";

/** Mock mode flag. Link mode by default; NEXT_PUBLIC_SEND_MODE=api switches every channel to API mode. */
export function getSendMode(channel: Channel): SendMode {
  void channel; // per-channel switches arrive with the real providers
  return process.env.NEXT_PUBLIC_SEND_MODE === "api" ? "api" : "link";
}

/** True when the dashboard reads from the database (NEXT_PUBLIC_ADMIN_API=http), so link-mode messages must be saved there too. */
export function savesOnServer(): boolean {
  return process.env.NEXT_PUBLIC_ADMIN_API === "http";
}
