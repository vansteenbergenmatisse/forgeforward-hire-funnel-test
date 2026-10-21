"use client";

import { useRef } from "react";
import { useCountdown } from "./use-countdown";
import { CountdownScreen, PrepScreen } from "./ui/prep-screens";

type Common = { stream: MediaStream | null; audioOnly: boolean };

export function PrepStage({ prompt, prepSeconds, round, notice, onReady, ...common }: Common & { prompt: string; prepSeconds: number; round: number; notice: string | null; onReady: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { left, skip } = useCountdown(prepSeconds, onReady, round);
  return (
    <PrepScreen
      {...common}
      prompt={prompt}
      secondsLeft={left}
      totalSeconds={prepSeconds}
      notice={notice}
      onReady={skip}
      videoRef={videoRef}
    />
  );
}

export function CountdownStage({ onDone, ...common }: Common & { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { left } = useCountdown(3, onDone);
  return <CountdownScreen {...common} count={Math.max(1, left)} videoRef={videoRef} />;
}
