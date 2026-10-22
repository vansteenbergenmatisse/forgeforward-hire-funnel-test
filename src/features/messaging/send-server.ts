import { emailConfigured, sendEmail } from "@/platform/email";
import { ghlConfigured, sendGhlSms } from "@/platform/ghl";
import { sendWhatsAppTemplate, sendWhatsAppText, whatsappConfigured } from "@/platform/whatsapp";
import { buildCalLink } from "@/features/bookings";
import type { Channel, TemplateDef } from "@/features/projects";
import { optionalEnv } from "@/shared/env";
import { buildLinkUrl } from "./link-url";
import { prepareMessage, validateOutgoing } from "./prepare-message";
import { WHATSAPP_WINDOW_HOURS } from "./whatsapp-window";
import type { SendOutcome, SendRequest } from "./send-api";

export type SendApplicant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneE164: string;
  projectName: string;
  calLink: string;
};

export type OutgoingRow = {
  applicantId: string;
  channel: Channel;
  mode: "api" | "link";
  templateId: string | null;
  body: string;
  providerMessageId: string | null;
  status: "sent" | "failed" | "opened_link";
  error: string | null;
};

/** Data access for sending. The DB version lives in message-store.ts; tests pass an in-memory one. */
export type SendStore = {
  loadApplicant(id: string): Promise<SendApplicant | null>;
  loadTemplate(id: string): Promise<TemplateDef | null>;
  lastWhatsAppReplyAt(applicantId: string): Promise<Date | null>;
  insertMessage(row: OutgoingRow): Promise<void>;
};

const DEFAULT_WA_VARIABLES = ["first_name", "cal_link"];

function configured(channel: Channel): boolean {
  return channel === "email" ? emailConfigured() : channel === "sms" ? ghlConfigured() : whatsappConfigured();
}

/** Fills a template, builds the final text and sends it. Missing keys fall back to link mode. */
export async function sendApplicantMessage(store: SendStore, req: SendRequest, now = new Date()): Promise<SendOutcome> {
  const a = await store.loadApplicant(req.applicantId);
  if (!a) return { ok: false, code: "not_found", error: "Applicant not found." };

  let template: TemplateDef | null = null;
  if (req.templateId) {
    template = await store.loadTemplate(req.templateId);
    if (!template || template.channel !== req.channel) return { ok: false, code: "invalid", error: "Template not found for this channel." };
  }

  const values = {
    first_name: a.firstName,
    last_name: a.lastName,
    project_name: a.projectName,
    cal_link: a.calLink ? buildCalLink({ calLink: a.calLink, firstName: a.firstName, lastName: a.lastName, email: a.email, applicantId: a.id }) : "",
  };

  const prepared = template ? prepareMessage(template, values) : null;
  if (prepared && !prepared.ok) return { ok: false, code: "missing_variable", error: prepared.message, variable: prepared.variable };

  const body = req.body ?? (prepared?.ok ? prepared.body : "");
  const subject = req.subject ?? (prepared?.ok ? prepared.subject : "");
  const bodyError = validateOutgoing(body);
  if (bodyError) return { ok: false, code: "invalid", error: bodyError };
  if (req.channel === "email" && !subject.trim()) return { ok: false, code: "invalid", error: "The subject is empty." };

  // WhatsApp: free text only inside the 24h window, else an approved template with ordered variables.
  const waVars: string[] = [];
  let useWaTemplate = false;
  if (req.channel === "whatsapp" && req.mode !== "link") {
    const last = req.test ? null : await store.lastWhatsAppReplyAt(a.id);
    const open = last !== null && now.getTime() - last.getTime() < WHATSAPP_WINDOW_HOURS * 3_600_000;
    if (!open) {
      if (template?.waTemplateName) {
        useWaTemplate = true;
        for (const v of template.waVariables?.length ? template.waVariables : DEFAULT_WA_VARIABLES) {
          const val = (values as Record<string, string>)[v];
          if (!val) return { ok: false, code: "missing_variable", error: `Missing value for {${v}}. Fill it in before sending.`, variable: v };
          waVars.push(val);
        }
      } else if (!req.test && configured("whatsapp")) {
        return { ok: false, code: "window_closed", error: "The 24 hour window is closed. Pick an approved template." };
      }
    }
  }

  const save = (row: Pick<OutgoingRow, "mode" | "status" | "providerMessageId" | "error">) =>
    store.insertMessage({ applicantId: a.id, channel: req.channel, templateId: template?.id ?? null, body, ...row });

  if (req.mode === "link" || !configured(req.channel)) {
    if (req.test) return { ok: false, code: "not_configured", error: "This channel has no provider keys yet." };
    const url = buildLinkUrl({ channel: req.channel, phoneE164: a.phoneE164, email: a.email, subject, body });
    await save({ mode: "link", status: "opened_link", providerMessageId: null, error: null });
    return { ok: true, mode: "link", url };
  }

  const toEmail = req.test ? optionalEnv("TEST_EMAIL") : a.email;
  const toPhone = req.test ? optionalEnv("TEST_PHONE") : a.phoneE164;
  if (req.channel === "email" ? !toEmail : !toPhone) {
    return { ok: false, code: "not_configured", error: `Set ${req.channel === "email" ? "TEST_EMAIL" : "TEST_PHONE"} to send a test.` };
  }

  const result =
    req.channel === "email"
      ? await sendEmail({ to: toEmail as string, subject, text: body })
      : req.channel === "sms"
        ? await sendGhlSms({ phoneE164: toPhone as string, firstName: a.firstName, lastName: a.lastName, email: a.email, body })
        : useWaTemplate
          ? await sendWhatsAppTemplate({ to: toPhone as string, name: template?.waTemplateName as string, language: template?.waLanguage ?? "en", variables: waVars })
          : await sendWhatsAppText({ to: toPhone as string, body });

  if (!result.ok) {
    if (!req.test) await save({ mode: "api", status: "failed", providerMessageId: null, error: result.error });
    return { ok: false, code: "provider", error: result.error };
  }
  if (!req.test) await save({ mode: "api", status: "sent", providerMessageId: result.providerMessageId, error: null });
  return { ok: true, mode: "api", status: "sent", test: Boolean(req.test) };
}
