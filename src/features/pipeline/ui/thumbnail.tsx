import { Mic, Play } from "lucide-react";
import type { ApplicantView } from "@/features/applicants";
import { cn } from "@/shared/cn";

const SIZE = { card: "h-[70px] w-[52px] rounded-md", row: "h-[44px] w-[40px] rounded-md" } as const;

function Silhouette() {
  return (
    <svg viewBox="0 0 60 80" preserveAspectRatio="xMidYMax meet" aria-hidden className="absolute inset-x-0 bottom-0 h-4/5 w-full fill-white/20">
      <circle cx="30" cy="32" r="12" />
      <path d="M8 80c2-16 11-26 22-26s20 10 22 26z" />
    </svg>
  );
}

/** Dark video thumbnail with a play badge, a mic badge for audio only, or an empty tile when there is no usable media. */
export function Thumbnail({ applicant, size = "card" }: { applicant: Pick<ApplicantView, "media" | "audioOnly">; size?: keyof typeof SIZE }) {
  const { media } = applicant;
  const usable = media !== null && media.deletedAt === null;
  const small = size === "row";
  if (!usable) return <span aria-hidden className={cn("block shrink-0 bg-sand", SIZE[size])} />;
  const audio = applicant.audioOnly || media.kind === "audio";
  return (
    <span aria-hidden data-thumb className={cn("relative block shrink-0 overflow-hidden bg-charcoal-2", SIZE[size])}>
      {!audio && <Silhouette />}
      <span className="absolute inset-0 flex items-center justify-center text-white">
        <span className={cn("flex items-center justify-center rounded-full bg-charcoal/55", small ? "size-[22px]" : "size-[30px]")}>
          {audio ? <Mic className={small ? "size-3" : "size-[18px]"} /> : <Play className={cn("fill-current", small ? "size-2.5" : "size-4")} />}
        </span>
      </span>
    </span>
  );
}
