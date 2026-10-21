import { CheckCircle2, Loader2, Mail, MessageCircle, MessageSquare, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, Button } from "@/components/ui";
import { maskEmail, maskPhone } from "../masking";
import type { ChannelFeedback } from "../use-test-console";
import type { Channel, ChannelMode } from "../types";

const CHANNELS: { id: Channel; label: string; icon: ReactNode; to: "email" | "phone" }[] = [
  { id: "email", label: "Email", icon: <Mail className="size-4" aria-hidden />, to: "email" },
  { id: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="size-4" aria-hidden />, to: "phone" },
  { id: "sms", label: "SMS", icon: <MessageSquare className="size-4" aria-hidden />, to: "phone" },
];

type Props = {
  target: { email: string; phone: string };
  modes: Record<Channel, ChannelMode>;
  feedback: Partial<Record<Channel, ChannelFeedback>>;
  onSend: (c: Channel) => void;
};

export function SendTestCard({ target, modes, feedback, onSend }: Props) {
  return (
    <section aria-labelledby="send-title" className="rounded-[14px] border border-line bg-white px-5 py-[18px]">
      <h2 id="send-title" className="font-sans! text-base! font-extrabold! normal-case! leading-normal! tracking-normal!">
        Send a test to yourself
      </h2>
      <p className="mb-2 mt-0.5 text-[13px] text-muted">Goes to TEST_EMAIL and TEST_PHONE.</p>
      <ul className="list-none">
        {CHANNELS.map((c) => {
          const fb = feedback[c.id];
          const to = c.to === "email" ? maskEmail(target.email) : maskPhone(target.phone);
          return (
            <li key={c.id} className="border-t border-line py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-bold">
                  {c.icon}
                  {c.label}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Badge tone={modes[c.id] === "api" ? "green" : "gray"}>{modes[c.id] === "api" ? "API mode" : "Link mode"}</Badge>
                  <Button variant="secondary" size="sm" onClick={() => onSend(c.id)} disabled={fb?.state === "sending"} aria-label={`Send test ${c.label} to me`}>
                    {fb?.state === "sending" ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
                    Send test to me
                  </Button>
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                To <span className="font-semibold tabular-nums text-charcoal">{to}</span>
              </p>
              <div aria-live="polite">
                {fb?.state === "done" && (
                  <p className={`mt-1.5 flex items-start gap-1.5 text-[13px] font-semibold ${fb.ok ? "text-ok" : "text-signal-deep"}`}>
                    {fb.ok ? <CheckCircle2 className="mt-px size-4 shrink-0" aria-hidden /> : <XCircle className="mt-px size-4 shrink-0" aria-hidden />}
                    {fb.message}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
