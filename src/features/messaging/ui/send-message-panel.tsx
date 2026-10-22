"use client";

import { useState } from "react";
import { AlertCircle, ArrowLeft, Clock } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { Field, Select, TextArea, TextInput } from "@/components/forms";
import type { ApplicantActions, ApplicantView } from "@/features/applicants";
import type { Channel, TemplateDef } from "@/features/projects";
import { getSendMode, savesOnServer } from "../send-mode";
import { InvalidContactError, buildLinkUrl } from "../link-url";
import { sendMessage } from "../send-message";
import { sendViaApi } from "../send-client";
import { validateOutgoing } from "../prepare-message";
import { whatsappWindow, whatsappWindowText } from "../whatsapp-window";
import { SendSuccess } from "./send-success";
import { useDraft } from "./use-draft";

const LABEL: Record<Channel, string> = { whatsapp: "WhatsApp", sms: "SMS", email: "Email" };

export type SendMessagePanelProps = {
  applicant: ApplicantView;
  project: { name: string; calLink: string };
  templates: TemplateDef[];
  channel: Channel;
  actions: Pick<ApplicantActions, "addMessage">;
  /** Back to the applicant details (Cancel, back arrow and the success button). */
  onBack: () => void;
};

/** The send modal, shown as a panel state inside the drawer so dialogs never stack. */
export function SendMessagePanel({ applicant, project, templates, channel, actions, onBack }: SendMessagePanelProps) {
  const mode = getSendMode(channel);
  const d = useDraft(applicant, project, templates, channel);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [sentMode, setSentMode] = useState(mode);
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  if (sent) return <SendSuccess channel={channel} mode={sentMode} manualUrl={manualUrl} onBack={onBack} />;

  const win = channel === "whatsapp" ? whatsappWindow(applicant.messages, now) : null;
  // What the admin sees in the box is what goes out, so only that text can block a send.
  // A variable the template could not fill is a warning: the box then still holds the raw {token}, which blocks until it is edited.
  const missing = d.prepared && !d.prepared.ok ? d.prepared.message : null;
  const blocking = validateOutgoing(d.body);
  const target = channel === "email" ? applicant.email : applicant.phoneE164;
  const usedVars = d.prepared?.ok ? d.prepared.used : [];

  /**
   * Opens the wa.me, sms: or mailto: link. Must run straight from the click, before any await, or Safari and iOS block it.
   * sms: and mailto: go through the page location so no empty tab is left behind. Returns false when the browser blocked it.
   */
  function openUrl(url: string): boolean {
    try {
      if (/^(sms|mailto):/i.test(url)) {
        window.location.href = url;
        return true;
      }
      const w = window.open(url, "_blank");
      if (!w) return false;
      w.opener = null;
      return true;
    } catch {
      return false;
    }
  }

  const apiInput = (test: boolean) => ({
    applicantId: applicant.id,
    channel,
    templateId: d.template?.id,
    subject: channel === "email" ? d.subject : undefined,
    body: d.body,
    test,
  });

  async function send() {
    if (blocking || busy) return;
    if (mode === "api") {
      setBusy(true);
      setApiError(null);
      const r = await sendViaApi(apiInput(false));
      setBusy(false);
      if (!r.ok) return setApiError(r.error);
      // The server saved the row. Keep the on-screen list in step.
      const actual = r.mode;
      actions.addMessage(applicant.id, {
        channel,
        direction: "out",
        mode: actual,
        body: d.body,
        subject: channel === "email" ? d.subject : undefined,
        templateName: d.template?.name,
        status: actual === "api" ? "sent" : "opened_link",
      });
      // The link came back after a network call, so a strict browser may refuse to open it. The success screen then offers it.
      if (actual === "link" && r.url && !openUrl(r.url)) setManualUrl(r.url);
      setSentMode(actual);
      return setSent(true);
    }
    // Link mode: open the app first, straight from the click, then save the row.
    const input = { applicantId: applicant.id, channel, mode, phoneE164: applicant.phoneE164, email: applicant.email, subject: d.subject, body: d.body, templateName: d.template?.name };
    let url: string;
    try {
      url = buildLinkUrl(input);
    } catch (e) {
      return setApiError(e instanceof InvalidContactError ? e.message : "Could not build the link.");
    }
    if (!openUrl(url)) return setApiError(`Your browser blocked the ${LABEL[channel]} window. Allow pop-ups for this site and press Send again.`);
    if (savesOnServer()) {
      // The server only saves the row, so the timeline survives a reload.
      setBusy(true);
      setApiError(null);
      const saved = await sendViaApi({ ...apiInput(false), mode: "link" });
      setBusy(false);
      if (!saved.ok) return setApiError(`Your ${LABEL[channel]} app opened, but the message was not saved. ${saved.error}`);
    }
    sendMessage(actions, input, () => {});
    setSent(true);
  }

  async function sendTest() {
    if (blocking || busy) return;
    setBusy(true);
    setApiError(null);
    setNote(null);
    const r = await sendViaApi(apiInput(true));
    setBusy(false);
    if (r.ok) setNote("Test sent to you.");
    else setApiError(r.error);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-line px-6 py-4">
        <button type="button" onClick={onBack} aria-label="Back to applicant" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-sand">
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <h2 id="send-title" className="text-xl">Send {LABEL[channel]}</h2>
        <Badge tone={mode === "api" ? "green" : "amber"} dot className="ml-1">
          {mode === "api" ? "API mode" : "Link mode"}
        </Badge>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <p className="text-sm text-muted">
          To <span className="font-bold text-charcoal">{applicant.firstName} {applicant.lastName}</span> · {target}
        </p>
        {mode === "link" && (
          <p className="text-sm text-muted">Link mode: Send saves the message, then opens your {LABEL[channel]} app with the text.</p>
        )}
        {win && (
          <p className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${win.open ? "bg-ok-tint text-ok" : "bg-amber-tint text-amber"}`}>
            <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {whatsappWindowText(win)}
              {win.open && ` ${applicant.firstName} replied ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(win.lastReplyAt))}.`}
            </span>
          </p>
        )}

        {d.channelTemplates.length > 0 ? (
          <Field label="Template" htmlFor="send-template">
            <Select id="send-template" value={d.templateId} onChange={(e) => d.setTemplateId(e.target.value)} className="h-11 text-sm pointer-coarse:text-base">
              {d.channelTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
        ) : (
          <p className="rounded-lg bg-sand px-3 py-2.5 text-sm text-muted">No {LABEL[channel]} templates yet. Add one in Settings, or write the message below.</p>
        )}

        {channel === "email" && (
          <Field label="Subject" htmlFor="send-subject">
            <TextInput id="send-subject" value={d.subject} onChange={(e) => d.setSubject(e.target.value)} className="h-11 text-sm pointer-coarse:text-base" />
          </Field>
        )}

        <Field label="Message" htmlFor="send-body" hint={usedVars.length ? `Variables filled: ${usedVars.join(", ")}` : undefined}>
          <TextArea id="send-body" value={d.body} onChange={(e) => d.setBody(e.target.value)} className="min-h-40 text-sm pointer-coarse:text-base leading-relaxed" />
        </Field>

        {missing && (
          <p className="flex items-start gap-1.5 text-sm font-semibold text-amber">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {missing}
          </p>
        )}
        {blocking && (
          <p role="alert" className="flex items-start gap-1.5 text-sm font-semibold text-signal-deep">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {blocking} Send is blocked.
          </p>
        )}
        {apiError && (
          <p role="alert" className="flex items-start gap-1.5 text-sm font-semibold text-signal-deep">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {apiError}
          </p>
        )}
        {note && <p role="status" className="text-sm font-semibold text-ok">{note}</p>}
      </div>

      <footer className="flex justify-end gap-2 border-t border-line px-6 py-4">
        <Button variant="secondary" onClick={onBack}>Cancel</Button>
        {mode === "api" && (
          <Button variant="secondary" onClick={sendTest} disabled={!!blocking || busy}>Send test to me</Button>
        )}
        <Button variant="primary" onClick={send} disabled={!!blocking || busy} aria-describedby={blocking ? "send-title" : undefined}>
          Send {LABEL[channel]}
        </Button>
      </footer>
    </div>
  );
}
