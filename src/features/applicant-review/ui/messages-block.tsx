import { ArrowDownLeft, ArrowUpRight, Mail, MessageCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui";
import type { ApplicantView } from "@/features/applicants";
import type { Channel } from "@/features/projects";
import { cn } from "@/shared/cn";
import { formatStamp } from "../lib/format";
import { CHANNEL_LABEL, statusLabel } from "../lib/message-status";
import { Section } from "./section";

const ICON = { whatsapp: MessageCircle, sms: MessageSquare, email: Mail } as const;

export function MessagesBlock({ a, onSend }: { a: ApplicantView; onSend: (c: Channel) => void }) {
  const channels: Channel[] = a.whatsappOk ? ["whatsapp", "sms", "email"] : ["sms", "email"];
  const rows = [...a.messages].sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());
  return (
    <Section title="Message">
      <div className="flex flex-wrap gap-2">
        {channels.map((c) => {
          const Icon = ICON[c];
          return (
            <Button key={c} variant="secondary" size="md" icon={<Icon className="size-4" aria-hidden />} onClick={() => onSend(c)}>
              {CHANNEL_LABEL[c]}
            </Button>
          );
        })}
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No messages yet. Pick a channel to send the first one.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {rows.map((m) => (
            <li key={m.id} className={cn("rounded-lg border px-3.5 py-3", m.direction === "in" ? "border-blue/30 bg-blue-tint" : "border-line bg-white")}>
              <p className="flex items-center gap-1.5 text-[13px] text-muted">
                {m.direction === "in" ? <ArrowDownLeft className="size-3.5" aria-label="Received" /> : <ArrowUpRight className="size-3.5" aria-label="Sent" />}
                <span className="font-bold text-charcoal">{CHANNEL_LABEL[m.channel]}</span>
                <span aria-hidden>·</span>
                <span>{statusLabel(m)}</span>
                <span aria-hidden>·</span>
                <time dateTime={m.at}>{formatStamp(m.at)}</time>
              </p>
              {m.subject && <p className="mt-1 text-sm font-bold text-charcoal">{m.subject}</p>}
              <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-charcoal">{m.body}</p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
