"use client";

import { Play, RotateCcw, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui";
import { formatClock } from "../format";
import { FlowScreen } from "./flow-screen";
import { Preview } from "./preview";

type Props = {
  /** Object URL of the recording. Missing in the debug view. */
  src: string | null;
  audioOnly: boolean;
  seconds: number;
  retakesLeft: number;
  onUse: () => void;
  onRetake: () => void;
};

export function ReviewScreen({ src, audioOnly, seconds, retakesLeft, onUse, onRetake }: Props) {
  return (
    <FlowScreen
      label="Review your video"
      footer={
        <>
          <Button size="lg" className="h-14 text-[17px] font-extrabold" icon={<ThumbsUp className="size-5" aria-hidden />} onClick={onUse}>
            Use this video
          </Button>
          {retakesLeft > 0 ? (
            <Button size="lg" variant="secondary" className="h-14 border-2 text-[17px] font-extrabold" icon={<RotateCcw className="size-5" aria-hidden />} onClick={onRetake}>
              Retake ({retakesLeft} left)
            </Button>
          ) : (
            <p className="py-2 text-center text-[15px] font-semibold text-muted">This is your final take.</p>
          )}
        </>
      }
    >
      {src && !audioOnly ? (
        <video src={src} controls playsInline preload="metadata" className="h-[400px] w-full rounded-2xl bg-charcoal object-contain md:h-[360px]" aria-label="Your recording" />
      ) : src && audioOnly ? (
        <div className="flex h-[200px] items-center justify-center rounded-2xl bg-charcoal-2 px-4">
          <audio src={src} controls className="w-full" aria-label="Your recording" />
        </div>
      ) : (
        <Preview stream={null} className="w-full h-[400px] md:h-[360px]">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-[72px] items-center justify-center rounded-full bg-white/90 text-charcoal">
              <Play className="size-8 fill-current" aria-hidden />
            </span>
          </div>
          <span className="absolute bottom-3 right-3 rounded-md bg-charcoal/70 px-[9px] py-1 text-[12.5px] font-bold text-white">{formatClock(seconds)}</span>
        </Preview>
      )}
      <h1 className="mt-4 text-[30px] leading-[0.98] md:text-4xl">How did that look?</h1>
      <p className="mt-2 text-base leading-normal text-muted">
        Watch it back. Happy with it? Use it.{retakesLeft > 0 ? ` You get ${retakesLeft === 1 ? "one retake" : `${retakesLeft} retakes`}.` : ""}
      </p>
    </FlowScreen>
  );
}
