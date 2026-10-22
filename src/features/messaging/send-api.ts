import { z } from "zod";

export const sendRequestSchema = z.object({
  applicantId: z.string().uuid(),
  channel: z.enum(["email", "sms", "whatsapp"]),
  templateId: z.string().uuid().optional(),
  subject: z.string().max(300).optional(),
  body: z.string().max(5000).optional(),
  /** "Send test to me": goes to TEST_EMAIL or TEST_PHONE and is not saved on the applicant. */
  test: z.boolean().optional(),
});
export type SendRequest = z.infer<typeof sendRequestSchema>;

export type SendFailCode = "not_found" | "invalid" | "missing_variable" | "window_closed" | "not_configured" | "provider";

export type SendOutcome =
  | { ok: true; mode: "api"; status: "sent"; test: boolean }
  | { ok: true; mode: "link"; url: string }
  | { ok: false; code: SendFailCode; error: string; variable?: string };
