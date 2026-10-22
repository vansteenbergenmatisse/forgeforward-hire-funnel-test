"use client";

import { useState } from "react";
import { Check, Compass, Copy, ExternalLink } from "lucide-react";
import { LinkField } from "@/components/forms";
import { MainButton, StepBody, StepFooter, TextButton } from "@/components/funnel";
import { copyText } from "../lib/copy-text";
import { buildChromeIntentUrl, isAndroid } from "../lib/in-app";
import { useUserAgent } from "./use-user-agent";

/** A0.3: shown first inside Facebook, Instagram, TikTok, LinkedIn and Line browsers. */
export function InAppScreen({ onContinue, pageUrl }: { onContinue: () => void; pageUrl?: string }) {
  const ua = useUserAgent();
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const url = pageUrl ?? (typeof window !== "undefined" ? window.location.href : "");
  const intent = isAndroid(ua) ? buildChromeIntentUrl(url) : null;

  async function copy() {
    if (await copyText(url)) {
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2500);
    } else {
      setCopyFailed(true);
    }
  }

  return (
    <>
      <StepBody>
        <div className="flex flex-col items-center pt-[30px] text-center md:pt-0">
          <div className="grid size-16 place-items-center rounded-full bg-signal-tint text-signal md:size-[76px]">
            <Compass className="size-[30px] md:size-9" aria-hidden />
          </div>
          <h1 className="mt-[18px] text-[34px] leading-[0.98] md:text-[44px]">Open this in your browser</h1>
          <p className="mt-3 text-base leading-normal text-muted md:text-[17px]">
            The video step works best in Chrome or Safari. Tap the button to copy this link. Then paste it in your browser.
          </p>
          <p role="status" className="mt-3 min-h-5 text-sm font-semibold text-ok">
            {copied && "Link copied. Paste it in your browser."}
            {copyFailed && <span className="text-signal-deep">Could not copy. Press and hold the link below to copy it.</span>}
          </p>
          {copyFailed && <LinkField value={url} label="Link to this page" className="mt-2" />}
        </div>
      </StepBody>
      <StepFooter>
        <MainButton onClick={copy} icon={copied ? <Check className="size-5" aria-hidden /> : <Copy className="size-5" aria-hidden />}>
          {copied ? "Copied" : "Copy link"}
        </MainButton>
        {intent && (
          <a
            href={intent}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-xl border-2 border-line bg-white text-[17px] font-extrabold text-charcoal transition-colors hover:bg-sand"
          >
            <ExternalLink className="size-5" aria-hidden />
            Open in Chrome
          </a>
        )}
        <TextButton onClick={onContinue}>Continue here anyway</TextButton>
      </StepFooter>
    </>
  );
}
