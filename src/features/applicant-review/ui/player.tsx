"use client";

import { useEffect } from "react";
import { Download, Mic, Trash2, User } from "lucide-react";
import type { MediaView } from "@/features/applicants";
import { MediaControls } from "./media-controls";
import { useMedia } from "./use-media";

export function Player({ media, name, autoPlay }: { media: MediaView | null; name: string; autoPlay?: boolean }) {
  if (!media) return <PlayerShell>No video yet. This applicant has not recorded one.</PlayerShell>;
  if (media.deletedAt) return <PlayerShell icon={<Trash2 className="size-6" aria-hidden />} title="Video deleted">Removed by the 30 day rule.</PlayerShell>;
  return <ActivePlayer media={media} name={name} autoPlay={autoPlay} />;
}

function PlayerShell({ icon, title, children }: { icon?: React.ReactNode; title?: string; children: React.ReactNode }) {
  return (
    <div className="flex aspect-video flex-col items-center justify-center gap-1 rounded-xl bg-charcoal px-6 text-center text-side-text" role="status">
      {icon}
      {title && <p className="text-base font-bold text-white">{title}</p>}
      <p className="text-sm">{children}</p>
    </div>
  );
}

function ActivePlayer({ media, name, autoPlay }: { media: MediaView; name: string; autoPlay?: boolean }) {
  const m = useMedia(media.src, media.seconds, media.kind);
  const el = m.ref;
  useEffect(() => {
    // Browsers may refuse autoplay. The play button still works, so ignore that rejection.
    if (autoPlay) void el.current?.play().catch(() => {});
  }, [autoPlay, el]);
  const label = `${media.kind === "video" ? "Video" : "Audio"} from ${name}`;
  const common = { ref: m.ref, src: media.src, preload: "metadata" as const, "aria-label": label, ...m.handlers };

  return (
    <figure className="overflow-hidden rounded-xl bg-charcoal">
      <div className="relative aspect-video bg-charcoal-2">
        {media.kind === "video" ? (
          <video {...common} playsInline onClick={m.toggle} className="size-full object-contain" />
        ) : (
          <audio {...common} />
        )}
        {(!m.started || media.kind === "audio") && !m.failed && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-charcoal-2 text-side-muted">
            <span className="grid size-24 place-items-center rounded-full bg-charcoal">
              {media.kind === "audio" ? <Mic className="size-10" aria-hidden /> : <User className="size-12" aria-hidden />}
            </span>
            {media.kind === "audio" && <span className="absolute bottom-3 text-xs font-bold uppercase tracking-wide">Audio only</span>}
          </div>
        )}
        {m.failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-charcoal px-6 text-center" role="alert">
            <p className="text-sm text-side-text">This browser cannot play the file.</p>
            <a
              href={media.src}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-charcoal hover:bg-sand"
            >
              <Download className="size-4" aria-hidden />
              Download {media.kind}
            </a>
          </div>
        )}
      </div>
      {!m.failed && (
        <MediaControls
          playing={m.playing}
          time={m.time}
          duration={m.duration}
          rate={m.rate}
          muted={m.muted}
          onToggle={m.toggle}
          onSeek={m.seek}
          onRate={m.setRate}
          onMute={m.toggleMute}
        />
      )}
    </figure>
  );
}
