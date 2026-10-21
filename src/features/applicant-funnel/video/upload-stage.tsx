"use client";

import { useEffect, useRef, useState } from "react";
import type { FunnelApi } from "../types";
import { loadTake, type Take } from "./recording-store";
import { runUpload } from "./run-upload";
import { UploadScreen } from "./ui/upload-screens";

type Props = {
  api: FunnelApi;
  resumeToken: string;
  /** The take from this session. Missing when the page reopened with a saved recording. */
  take: Take | null;
  resuming: boolean;
  onDone: () => void;
  onFailed: () => void;
  onMissing: () => void;
};

/** Runs one upload attempt. Mount it again to retry. Guarded so React Strict Mode never completes twice. */
export function UploadStage({ api, resumeToken, take, resuming, onDone, onFailed, onMissing }: Props) {
  const [percent, setPercent] = useState(0);
  const startedRef = useRef(false);
  const mountedRef = useRef(false);
  const cbRef = useRef({ onDone, onFailed, onMissing });
  useEffect(() => {
    cbRef.current = { onDone, onFailed, onMissing };
  });

  useEffect(() => {
    mountedRef.current = true;
    if (!startedRef.current) {
      startedRef.current = true;
      void (async () => {
        const t = take ?? (await loadTake(resumeToken));
        if (!t) {
          if (mountedRef.current) cbRef.current.onMissing();
          return;
        }
        try {
          await runUpload(api, resumeToken, t, (p) => mountedRef.current && setPercent(p));
          if (mountedRef.current) cbRef.current.onDone();
        } catch {
          if (mountedRef.current) cbRef.current.onFailed();
        }
      })();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [api, resumeToken, take]);

  return <UploadScreen percent={percent} resuming={resuming} />;
}
