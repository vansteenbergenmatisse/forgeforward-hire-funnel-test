"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { Badge } from "@/components/ui";

const FUNNEL_HOST = "apply.forgeforward.io/a";

/** The applicant link with a Copy button, plus the Open or Closed badge. */
export function FunnelLinkChip({ slug, open }: { slug: string; open: boolean }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const text = `${FUNNEL_HOST}/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(`https://${text}`);
      setState("copied");
    } catch {
      setState("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-10 items-center gap-1.5 rounded-[9px] border border-line-strong bg-white pl-3 pr-1.5 text-[13px] text-muted">
        <Link2 className="size-4" aria-hidden />
        <span className="font-semibold text-charcoal">{text}</span>
        <button
          type="button"
          onClick={copy}
          className="ml-1 inline-flex h-7 items-center gap-1.5 rounded-[7px] bg-sand px-2.5 text-[12.5px] font-bold text-charcoal hover:bg-line focus-visible:outline-2 focus-visible:outline-charcoal"
        >
          {state === "copied" ? <Check className="size-3.5 text-ok" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          <span aria-live="polite">{state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy"}</span>
        </button>
      </div>
      <Badge tone={open ? "green" : "gray"} dot>
        {open ? "Open" : "Closed"}
      </Badge>
    </div>
  );
}
