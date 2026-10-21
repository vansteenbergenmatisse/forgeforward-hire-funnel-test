import type { ApplicantActions } from "@/features/applicants";
import type { Channel } from "@/features/projects";
import { buildLinkUrl } from "./link-url";
import type { SendMode } from "./send-mode";

export type SendInput = {
  applicantId: string;
  channel: Channel;
  mode: SendMode;
  phoneE164: string;
  email: string;
  subject?: string;
  body: string;
  templateName?: string;
};

/** Saves an outgoing message. In link mode it also opens the wa.me, sms: or mailto: URL. */
export function sendMessage(actions: Pick<ApplicantActions, "addMessage">, i: SendInput, open: (url: string) => void): void {
  actions.addMessage(i.applicantId, {
    channel: i.channel,
    direction: "out",
    mode: i.mode,
    body: i.body,
    subject: i.channel === "email" ? i.subject : undefined,
    templateName: i.templateName,
    status: i.mode === "api" ? "sent" : "opened_link",
  });
  if (i.mode === "link") open(buildLinkUrl(i));
}
