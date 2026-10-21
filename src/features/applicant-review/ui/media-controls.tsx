import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/shared/cn";
import { formatDuration } from "../lib/format";

const RATES = [1, 1.5, 2] as const;

type Props = {
  playing: boolean;
  time: number;
  duration: number;
  rate: number;
  muted: boolean;
  onToggle: () => void;
  onSeek: (t: number) => void;
  onRate: (r: number) => void;
  onMute: () => void;
};

export function MediaControls({ playing, time, duration, rate, muted, onToggle, onSeek, onRate, onMute }: Props) {
  return (
    <div className="flex flex-col gap-2.5 px-4 py-3 text-white">
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={Math.min(time, duration || 1)}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Seek"
        aria-valuetext={`${formatDuration(time)} of ${formatDuration(duration)}`}
        className="h-1.5 w-full cursor-pointer accent-signal"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label={playing ? "Pause" : "Play"}
          className="grid size-10 place-items-center rounded-full bg-signal text-white hover:bg-signal-deep"
        >
          {playing ? <Pause className="size-5" aria-hidden /> : <Play className="size-5 translate-x-px" aria-hidden />}
        </button>
        <span className="text-sm font-semibold tabular-nums" aria-hidden>
          {formatDuration(time)} / {formatDuration(duration)}
        </span>
        <button
          type="button"
          onClick={onMute}
          aria-label={muted ? "Unmute" : "Mute"}
          aria-pressed={muted}
          className="grid size-9 place-items-center rounded-lg text-side-text hover:bg-charcoal-2 hover:text-white"
        >
          {muted ? <VolumeX className="size-5" aria-hidden /> : <Volume2 className="size-5" aria-hidden />}
        </button>
        <div className="ml-auto flex items-center gap-1.5" role="group" aria-label="Playback speed">
          <span className="mr-1 text-xs font-bold uppercase tracking-wide text-side-muted">Speed</span>
          {RATES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRate(r)}
              aria-pressed={rate === r}
              className={cn(
                "h-8 min-w-10 rounded-md px-2 text-[13px] font-bold tabular-nums",
                rate === r ? "bg-white text-charcoal" : "text-side-text hover:bg-charcoal-2 hover:text-white",
              )}
            >
              {r}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
