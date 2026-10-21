"use client";

import { CloudOff, RefreshCw, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui";
import { FlowScreen, IconBadge } from "./flow-screen";

export function UploadScreen({ percent, resuming }: { percent: number; resuming?: boolean }) {
  return (
    <FlowScreen label="Saving your video">
      <div className="flex flex-col items-center pt-[60px] text-center md:pt-0">
        <IconBadge>
          <UploadCloud className="size-7" aria-hidden />
        </IconBadge>
        <h1 className="mt-[18px] text-[34px] leading-[0.98]">{resuming ? "Finish saving your video" : "Saving your video"}</h1>
        <p className="mt-3 text-base leading-normal text-muted">Keep this page open.</p>
        <div className="mt-7 w-full">
          <div
            className="h-3 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-label="Saving your video"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div className="h-full rounded-full bg-signal transition-[width] duration-200 ease-out" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2.5 font-display text-[28px] tabular-nums">{percent}%</p>
        </div>
      </div>
    </FlowScreen>
  );
}

export function UploadFailedScreen({ onRetry, busy }: { onRetry: () => void; busy?: boolean }) {
  return (
    <FlowScreen
      label="Saving failed"
      footer={
        <Button size="lg" className="h-14 text-[17px] font-extrabold" loading={busy} icon={<RefreshCw className="size-5" aria-hidden />} onClick={onRetry}>
          Try again
        </Button>
      }
    >
      <div className="flex flex-col items-center pt-[60px] text-center md:pt-0">
        <IconBadge>
          <CloudOff className="size-7" aria-hidden />
        </IconBadge>
        <h1 className="mt-[18px] text-[34px] leading-[0.98]">Your connection dropped</h1>
        <p role="alert" className="mt-3 text-base leading-normal text-muted">Your video is still here. Tap to try again.</p>
      </div>
    </FlowScreen>
  );
}
