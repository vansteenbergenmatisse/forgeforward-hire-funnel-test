"use client";

import { Mic } from "lucide-react";
import { useCallback, useEffect, useRef, type ReactNode, type RefObject } from "react";
import { cn } from "@/shared/cn";

type Props = {
  stream: MediaStream | null;
  audioOnly?: boolean;
  className?: string;
  videoRef?: RefObject<HTMLVideoElement | null>;
  children?: ReactNode;
};

/** Mirrored live preview. Without a stream (or in audio only mode) it shows a placeholder. */
export function Preview({ stream, audioOnly, className, videoRef, children }: Props) {
  const inner = useRef<HTMLVideoElement | null>(null);
  const setRef = useCallback(
    (el: HTMLVideoElement | null) => {
      inner.current = el;
      if (videoRef) videoRef.current = el;
    },
    [videoRef],
  );

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    if (stream) void el.play().catch(() => {});
  }, [stream, audioOnly]);

  const showVideo = Boolean(stream) && !audioOnly;
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-[radial-gradient(120%_90%_at_50%_30%,var(--charcoal-2),var(--charcoal))]", className)} data-testid="preview">
      {showVideo ? (
        <video ref={setRef} autoPlay muted playsInline className="absolute inset-0 size-full -scale-x-100 object-cover" />
      ) : audioOnly ? (
        <div className="absolute inset-0 flex items-center justify-center text-side-muted">
          <Mic className="size-1/4" strokeWidth={1.5} aria-hidden />
        </div>
      ) : (
        <Silhouette />
      )}
      {children}
    </div>
  );
}

function Silhouette() {
  return (
    <svg
      viewBox="0 0 200 150"
      preserveAspectRatio="xMidYMax meet"
      className="absolute inset-x-0 bottom-0 h-[88%] w-full fill-side-muted/40"
      aria-hidden="true"
    >
      <circle cx="100" cy="62" r="30" />
      <path d="M40 150c4-34 30-52 60-52s56 18 60 52z" />
    </svg>
  );
}

export function PreviewPill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-charcoal/60 px-2.5 py-[5px] text-[12.5px] font-bold text-white",
        className,
      )}
    >
      {children}
    </span>
  );
}
