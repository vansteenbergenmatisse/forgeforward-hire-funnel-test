import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui";
import type { SendMode } from "../send-mode";

const CHANNEL_LABEL = { whatsapp: "WhatsApp", sms: "SMS", email: "Email" } as const;

type Props = { channel: keyof typeof CHANNEL_LABEL; mode: SendMode; onBack: () => void; manualUrl?: string | null };

export function SendSuccess({ channel, mode, onBack, manualUrl }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center" role="status">
      <span className="grid size-14 place-items-center rounded-full bg-ok-tint text-ok">
        <CheckCircle2 className="size-7" aria-hidden />
      </span>
      <div>
        <p className="text-lg font-extrabold text-charcoal">Message saved</p>
        <p className="mt-1 text-sm text-muted">
          {mode === "link"
            ? `Your ${CHANNEL_LABEL[channel]} app opened with the text. Press send there. It now shows in the message list and timeline.`
            : "It now shows in the message list and timeline. Status updates arrive here."}
        </p>
        {manualUrl && (
          <p className="mt-3 text-sm">
            Your browser did not open it.{" "}
            <a href={manualUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-blue underline">
              Open {CHANNEL_LABEL[channel]}
            </a>
          </p>
        )}
      </div>
      <Button variant="dark" size="md" onClick={onBack} autoFocus>
        Back to applicant
      </Button>
    </div>
  );
}
