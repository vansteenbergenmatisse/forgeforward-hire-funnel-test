import type { Channel } from "@/features/projects";

export type SendMode = "api" | "link";

/** Mock mode flag. Link mode by default; NEXT_PUBLIC_SEND_MODE=api switches every channel to API mode. */
export function getSendMode(channel: Channel): SendMode {
  void channel; // per-channel switches arrive with the real providers
  return process.env.NEXT_PUBLIC_SEND_MODE === "api" ? "api" : "link";
}
