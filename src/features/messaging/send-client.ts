import type { Channel } from "@/features/projects";

export type ApiSendInput = {
  applicantId: string;
  channel: Channel;
  templateId?: string;
  subject?: string;
  body: string;
  test?: boolean;
};

export type ApiSendResult =
  | { ok: true; mode: "api" | "link"; url?: string }
  | { ok: false; error: string };

/** Calls the admin send route. Used by the send modal when NEXT_PUBLIC_SEND_MODE=api. */
export async function sendViaApi(i: ApiSendInput, fetchFn: typeof fetch = fetch): Promise<ApiSendResult> {
  try {
    const res = await fetchFn("/api/admin/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(i),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; mode?: "api" | "link"; url?: string; error?: string } | null;
    if (res.ok && json?.ok && json.mode) return { ok: true, mode: json.mode, url: json.url };
    return { ok: false, error: json?.error ?? "Could not send. Try again." };
  } catch {
    return { ok: false, error: "Could not reach the server. Try again." };
  }
}
