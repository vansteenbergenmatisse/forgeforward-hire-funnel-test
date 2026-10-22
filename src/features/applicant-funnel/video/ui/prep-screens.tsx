"use client";

import { Play } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "@/components/ui";
import { formatClock } from "../format";
import { FlowScreen, Notice } from "./flow-screen";
import { Preview } from "./preview";

const CTA = "h-14 text-[17px] font-extrabold";
const RING = 2 * Math.PI * 52;

type PrepProps = {
  prompt: string;
  stream: MediaStream | null;
  audioOnly: boolean;
  secondsLeft: number;
  totalSeconds: number;
  notice: string | null;
  onReady: () => void;
  videoRef?: RefObject<HTMLVideoElement | null>;
};

export function PrepScreen({ prompt, stream, audioOnly, secondsLeft, totalSeconds, notice, onReady, videoRef }: PrepProps) {
  const fraction = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  return (
    <FlowScreen
      label="Get ready"
      footer={
        <Button size="lg" className={CTA} icon={<Play className="size-5" aria-hidden />} onClick={onReady}>
          I&apos;m ready
        </Button>
      }
    >
      {notice ? <Notice>{notice}</Notice> : null}
      <div className="rounded-2xl bg-charcoal px-5 py-[18px] text-white">
        <p className="text-xs font-extrabold uppercase tracking-wider text-signal-tint/70">Your prompt</p>
        <p className="mt-1.5 text-[21px] font-bold leading-[1.35] md:text-2xl">{prompt}</p>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <Preview stream={stream} audioOnly={audioOnly} videoRef={videoRef} className="h-[150px] w-[120px] flex-none rounded-[14px] md:h-[220px] md:w-auto md:flex-1" />
        <div className="flex flex-1 flex-col items-center gap-2 md:flex-none md:px-6">
          <div className="relative size-[118px] md:size-[144px]" role="timer" aria-label={`${formatClock(secondsLeft)} to get ready`}>
            <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
              <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" className="stroke-line" />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                className="stroke-signal transition-[stroke-dashoffset] duration-200 ease-linear"
                strokeDasharray={RING}
                strokeDashoffset={RING * (1 - fraction)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[44px] leading-none tabular-nums">{formatClock(secondsLeft)}</span>
              <span className="mt-0.5 text-xs font-bold text-subtle">to get ready</span>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-4 text-base leading-normal text-muted">Take a minute to get ready. Recording starts on its own at 0, after a 3, 2, 1.</p>
    </FlowScreen>
  );
}

type CountdownProps = { stream: MediaStream | null; audioOnly: boolean; count: number; videoRef?: RefObject<HTMLVideoElement | null> };

export function CountdownScreen({ stream, audioOnly, count, videoRef }: CountdownProps) {
  return (
    <FlowScreen label="Recording starts soon">
      <Preview stream={stream} audioOnly={audioOnly} videoRef={videoRef} className="w-full h-[min(520px,56dvh)] md:h-[420px]">
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-charcoal/40 text-white" role="timer" aria-live="assertive">
          <span className="font-display text-[160px] leading-none tabular-nums">{count}</span>
          <span className="mt-2 text-base font-bold">Recording starts</span>
        </div>
      </Preview>
    </FlowScreen>
  );
}
