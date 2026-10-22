"use client";

import { Square } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "@/components/ui";
import { formatClock } from "../format";
import { FlowScreen } from "./flow-screen";
import { Preview, PreviewPill } from "./preview";

type Props = {
  prompt: string;
  stream: MediaStream | null;
  audioOnly: boolean;
  elapsed: number;
  max: number;
  /** Seconds before Finish unlocks. */
  unlockIn: number;
  onFinish: () => void;
  videoRef?: RefObject<HTMLVideoElement | null>;
};

export function RecordScreen({ prompt, stream, audioOnly, elapsed, max, unlockIn, onFinish, videoRef }: Props) {
  const left = Math.max(0, max - elapsed);
  const pct = max > 0 ? Math.min(100, (elapsed / max) * 100) : 0;
  return (
    <FlowScreen
      label="Recording"
      footer={
        <>
          <Button size="lg" className="h-14 text-[17px] font-extrabold" icon={<Square className="size-5 fill-current" aria-hidden />} disabled={unlockIn > 0} onClick={onFinish}>
            Finish
          </Button>
          {unlockIn > 0 ? <p className="text-center text-sm text-muted">You can finish in {unlockIn} s</p> : null}
        </>
      }
    >
      <Preview stream={stream} audioOnly={audioOnly} videoRef={videoRef} className="w-full h-[min(520px,56dvh)] md:h-[420px]">
        <PreviewPill>
          <span className="size-2.5 animate-pulse rounded-full bg-signal motion-reduce:animate-none" aria-hidden />
          <span>Recording</span>
          <span className="tabular-nums">{formatClock(left)}</span>
        </PreviewPill>
      </Preview>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-[3px] bg-line"
        role="progressbar"
        aria-label="Recording time used"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(elapsed)}
      >
        <div className="h-full bg-signal" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[12.5px] font-bold tabular-nums text-subtle">
        <span>{formatClock(Math.floor(elapsed))} recorded</span>
        <span>{formatClock(left)} left</span>
      </div>
      <p className="mt-3.5 text-sm leading-[1.45] text-muted">
        <b className="text-charcoal">Prompt:</b> {prompt}
      </p>
    </FlowScreen>
  );
}
