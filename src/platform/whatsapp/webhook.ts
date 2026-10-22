import { z } from "zod";

export type WhatsAppEvent =
  | { type: "status"; messageId: string; status: "sent" | "delivered" | "read" | "failed"; error?: string }
  | { type: "inbound"; messageId: string; from: string; text: string; at: Date };

const payload = z.object({
  entry: z
    .array(
      z.object({
        changes: z
          .array(
            z.object({
              value: z.object({
                statuses: z
                  .array(
                    z.object({
                      id: z.string(),
                      status: z.string(),
                      errors: z.array(z.object({ title: z.string().optional(), message: z.string().optional() })).optional(),
                    }),
                  )
                  .optional(),
                messages: z
                  .array(
                    z.object({
                      id: z.string(),
                      from: z.string(),
                      timestamp: z.string().optional(),
                      type: z.string().optional(),
                      text: z.object({ body: z.string() }).optional(),
                    }),
                  )
                  .optional(),
              }),
            }),
          )
          .default([]),
      }),
    )
    .default([]),
});

const STATUSES = new Set(["sent", "delivered", "read", "failed"]);

/** Flattens a Cloud API webhook body into status and inbound events. Unknown shapes give no events. */
export function parseWebhook(body: unknown): WhatsAppEvent[] {
  const p = payload.safeParse(body);
  if (!p.success) return [];
  const out: WhatsAppEvent[] = [];
  for (const e of p.data.entry) {
    for (const c of e.changes) {
      for (const s of c.value.statuses ?? []) {
        if (!STATUSES.has(s.status)) continue;
        out.push({
          type: "status",
          messageId: s.id,
          status: s.status as "sent" | "delivered" | "read" | "failed",
          error: s.errors?.[0] ? (s.errors[0].message ?? s.errors[0].title) : undefined,
        });
      }
      for (const m of c.value.messages ?? []) {
        const secs = Number(m.timestamp);
        out.push({
          type: "inbound",
          messageId: m.id,
          from: m.from,
          text: m.text?.body ?? `[${m.type ?? "message"}]`,
          at: Number.isFinite(secs) && secs > 0 ? new Date(secs * 1000) : new Date(),
        });
      }
    }
  }
  return out;
}
