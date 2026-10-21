"use client";

import { ArrowRight, Camera, ShieldCheck, SwitchCamera, Sun, Video, VideoOff } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "@/components/ui";
import { FlowScreen, IconBadge, Notice } from "./flow-screen";
import { MicMeter } from "./mic-meter";
import { Preview, PreviewPill } from "./preview";

const CTA = "h-14 text-[17px] font-extrabold";

export function IntroScreen({ seconds, loading, onStart, notice }: { seconds: number; loading: boolean; onStart: () => void; notice?: string | null }) {
  return (
    <FlowScreen
      narrow
      label="Camera check"
      footer={
        <Button size="lg" className={CTA} loading={loading} icon={<Video className="size-5" aria-hidden />} onClick={onStart}>
          Turn on camera
        </Button>
      }
    >
      <div className="flex flex-col items-center pt-9 text-center md:pt-0">
        <IconBadge size="lg">
          <Camera className="size-[30px] md:size-9" aria-hidden />
        </IconBadge>
        <h1 className="mt-[18px] text-[34px] leading-[0.98] md:text-[44px]">Next: a {seconds} second video</h1>
        <p className="mt-3 text-base leading-normal text-muted md:text-[17px]">First let&apos;s check your camera.</p>
        {notice ? <div className="mt-4 w-full text-left"><Notice>{notice}</Notice></div> : null}
        <ul className="mt-[26px] flex w-full flex-col gap-2.5 text-left">
          <Tip icon={<Sun className="size-5 flex-none text-signal" aria-hidden />}>Find a quiet spot with good light</Tip>
          <Tip icon={<ShieldCheck className="size-5 flex-none text-signal" aria-hidden />}>Your browser asks to use the camera. Tap Allow.</Tip>
        </ul>
      </div>
    </FlowScreen>
  );
}

function Tip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-3 text-[15px] font-semibold">
      {icon}
      {children}
    </li>
  );
}

type WorksProps = {
  stream: MediaStream | null;
  level: number;
  audioOnly: boolean;
  canSwitch: boolean;
  onSwitch: () => void;
  onContinue: () => void;
  videoRef?: RefObject<HTMLVideoElement | null>;
};

/** A05 (camera works) and A06 (audio only). */
export function WorksScreen({ stream, level, audioOnly, canSwitch, onSwitch, onContinue, videoRef }: WorksProps) {
  return (
    <FlowScreen
      label={audioOnly ? "Audio only" : "Camera works"}
      footer={
        <Button size="lg" className={CTA} onClick={onContinue}>
          <span>Continue</span>
          <ArrowRight className="size-5" aria-hidden />
        </Button>
      }
    >
      <Preview stream={stream} audioOnly={audioOnly} videoRef={videoRef} className={audioOnly ? "w-full h-[300px] md:h-[260px]" : "w-full h-[380px] md:h-[330px]"}>
        <PreviewPill>
          {audioOnly ? <VideoOff className="size-3.5" aria-hidden /> : <span className="size-2 rounded-full border border-ok bg-ok/30" aria-hidden />}
          {audioOnly ? "Audio only" : "Camera on"}
        </PreviewPill>
        {canSwitch ? (
          <button
            type="button"
            onClick={onSwitch}
            aria-label="Switch camera"
            className="absolute right-3 top-3 flex size-12 items-center justify-center rounded-full bg-charcoal/60 text-white hover:bg-charcoal/80"
          >
            <SwitchCamera className="size-5" aria-hidden />
          </button>
        ) : null}
      </Preview>
      <div className="mt-4">
        <MicMeter level={level} />
      </div>
      <h1 className="mt-4 text-[30px] leading-[0.98] md:text-4xl">{audioOnly ? "No camera? No problem" : "Looking good"}</h1>
      <p className="mt-2 text-base leading-normal text-muted md:text-[17px]">
        {audioOnly ? "We could not find a camera. You can record with your voice." : "Say something and watch the bar move."}
      </p>
    </FlowScreen>
  );
}
