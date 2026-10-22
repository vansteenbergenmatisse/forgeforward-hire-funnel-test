import { parseWebhook, type WhatsAppEvent } from "@/platform/whatsapp";

export type DeliveryStatus = "sent" | "delivered" | "read" | "failed";

/** Data access for the WhatsApp webhook. The DB version lives in message-store.ts. */
export type WebhookStore = {
  currentStatus(providerMessageId: string): Promise<string | null>;
  updateStatus(providerMessageId: string, status: DeliveryStatus, error: string | null): Promise<void>;
  /** Returns false when this inbound message was already processed. */
  recordInbound(e: Extract<WhatsAppEvent, { type: "inbound" }>): Promise<boolean>;
};

const RANK: Record<string, number> = { sent: 1, delivered: 2, read: 3 };

/** Statuses only move forward. A late "delivered" never replaces "read". */
export function shouldAdvance(current: string | null, next: DeliveryStatus): boolean {
  if (current === null) return false;
  if (next === "failed") return current !== "read";
  return (RANK[next] ?? 0) > (RANK[current] ?? 0);
}

export async function handleWhatsAppEvents(store: WebhookStore, body: unknown): Promise<{ statuses: number; inbound: number }> {
  let statuses = 0;
  let inbound = 0;
  for (const e of parseWebhook(body)) {
    if (e.type === "status") {
      const cur = await store.currentStatus(e.messageId);
      if (shouldAdvance(cur, e.status)) {
        await store.updateStatus(e.messageId, e.status, e.status === "failed" ? (e.error ?? "Delivery failed.") : null);
        statuses++;
      }
    } else if (await store.recordInbound(e)) inbound++;
  }
  return { statuses, inbound };
}
