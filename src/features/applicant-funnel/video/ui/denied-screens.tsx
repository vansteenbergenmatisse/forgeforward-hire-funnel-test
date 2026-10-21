"use client";

import { Check, Copy, Link2, Lock, MicOff, RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/shared/cn";
import type { DeviceKind } from "../device";
import { FlowScreen, IconBadge } from "./flow-screen";

const CTA = "h-14 text-[17px] font-extrabold";

const TABS: { id: DeviceKind; label: string }[] = [
  { id: "iphone", label: "iPhone" },
  { id: "android", label: "Android" },
  { id: "desktop", label: "Computer" },
];

const STEPS: Record<DeviceKind, ReactNode[]> = {
  iphone: [
    <>Tap <b>aA</b> in the address bar.</>,
    <>Tap <b>Website Settings</b>.</>,
    <>Set <b>Camera</b> and <b>Microphone</b> to <b>Allow</b>.</>,
    <>Come back here and tap Try again.</>,
  ],
  android: [
    <>Tap the <b>lock</b> icon next to the address.</>,
    <>Tap <b>Permissions</b>.</>,
    <>Turn on <b>Camera</b> and <b>Microphone</b>.</>,
    <>Come back here and tap Try again.</>,
  ],
  desktop: [
    <>Click the <b>camera</b> icon at the right end of the address bar.</>,
    <>Choose <b>Always allow</b> for camera and microphone.</>,
    <>Click <b>Done</b>.</>,
    <>Come back here and click Try again.</>,
  ],
};

export function DeniedScreen({ device, onRetry }: { device: DeviceKind; onRetry: () => void }) {
  const [tab, setTab] = useState<DeviceKind>(device);
  return (
    <FlowScreen
      label="Camera blocked"
      footer={
        <Button size="lg" className={CTA} icon={<RefreshCw className="size-5" aria-hidden />} onClick={onRetry}>
          Try again
        </Button>
      }
    >
      <IconBadge>
        <Lock className="size-7" aria-hidden />
      </IconBadge>
      <h1 className="mt-4 text-[32px] leading-[0.98] md:text-4xl">Your camera is blocked</h1>
      <p className="mt-2 text-base leading-normal text-muted">Your browser said no to the camera. Here is how to turn it on.</p>
      <div role="tablist" aria-label="Your device" className="mt-5 flex gap-1 rounded-xl bg-sand p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "h-12 flex-1 rounded-[9px] text-sm font-bold",
              tab === t.id ? "bg-white text-charcoal shadow-sm" : "text-muted hover:text-charcoal",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ol className="mt-4 flex flex-col gap-3" role="tabpanel">
        {STEPS[tab].map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex size-[26px] flex-none items-center justify-center rounded-full bg-charcoal text-[13px] font-extrabold text-white">{i + 1}</span>
            <span className="text-[15.5px] leading-[1.45]">{step}</span>
          </li>
        ))}
      </ol>
    </FlowScreen>
  );
}

type MessageProps = { title: string; body: string; button: string; onClick: () => void; icon?: "mic" | "alert"; done?: boolean };

/** No microphone, or a browser without MediaRecorder. */
export function MessageScreen({ title, body, button, onClick, icon = "alert", done }: MessageProps) {
  return (
    <FlowScreen
      label={title}
      footer={
        <Button size="lg" className={CTA} icon={done ? <Check className="size-5" aria-hidden /> : icon === "mic" ? <RefreshCw className="size-5" aria-hidden /> : <Copy className="size-5" aria-hidden />} onClick={onClick}>
          {button}
        </Button>
      }
    >
      <div className="flex flex-col items-center pt-14 text-center md:pt-0">
        <IconBadge>{icon === "mic" ? <MicOff className="size-7" aria-hidden /> : <TriangleAlert className="size-7" aria-hidden />}</IconBadge>
        <h1 className="mt-[18px] text-[34px] leading-[0.98]">{title}</h1>
        <p className="mt-3 text-base leading-normal text-muted">{body}</p>
      </div>
    </FlowScreen>
  );
}

type HandoffProps = { getLink: () => Promise<string>; onTryAgain: () => void };

export function HandoffScreen({ getLink, onTryAgain }: HandoffProps) {
  const [link, setLink] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    getLink()
      .then((l) => alive && setLink(l))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [getLink]);

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <FlowScreen
      label="Finish in your browser"
      footer={
        <>
          <Button size="lg" className={CTA} disabled={!link} icon={copied ? <Check className="size-5" aria-hidden /> : <Copy className="size-5" aria-hidden />} onClick={copy}>
            {copied ? "Link copied" : "Copy link"}
          </Button>
          <Button size="lg" variant="ghost" className="h-12" onClick={onTryAgain}>Try the camera again</Button>
        </>
      }
    >
      <div className="flex flex-col items-center pt-14 text-center md:pt-0">
        <IconBadge>
          <Link2 className="size-7" aria-hidden />
        </IconBadge>
        <h1 className="mt-[18px] text-[34px] leading-[0.98]">Finish in your browser</h1>
        <p className="mt-3 text-base leading-normal text-muted">This app blocks your camera. Copy this link and open it in Chrome or Safari to finish.</p>
        <div className="mt-6 flex w-full items-center gap-2.5 rounded-xl border border-line-strong bg-sand px-3.5 py-3 text-left text-sm font-semibold" data-testid="handoff-link">
          <Link2 className="size-4 flex-none text-muted" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{failed ? "We could not make a link. Try again." : (link ?? "Making your link...")}</span>
        </div>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted">
          <Check className="size-4 flex-none text-ok" aria-hidden />
          Your details are saved. The link works once, for 24 hours.
        </p>
      </div>
    </FlowScreen>
  );
}
