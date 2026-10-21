"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { VideoFlowProps } from "../types";
import { DevVideoStub } from "./dev-video-stub";

/** Lazy mount of the video flow (separate feature module). Falls back to a stub if it fails to load in dev. */
const LazyVideoFlow = dynamic<VideoFlowProps>(
  () =>
    import("../video").then((m) => m.VideoFlow as ComponentType<VideoFlowProps>).catch((err) => {
      if (process.env.NODE_ENV === "production") throw err;
      return DevVideoStub;
    }),
  { ssr: false, loading: () => <p className="px-5 py-8 text-muted md:px-0">Loading</p> },
);

export function VideoStep({ useStub, ...props }: VideoFlowProps & { useStub?: boolean }) {
  if (useStub) return <DevVideoStub {...props} />;
  return <LazyVideoFlow {...props} />;
}
