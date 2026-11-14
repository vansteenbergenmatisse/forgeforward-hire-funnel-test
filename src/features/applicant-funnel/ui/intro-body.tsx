"use client";

import { useSyncExternalStore } from "react";
import { INTRO_PROSE, introIsHtml } from "@/features/projects";
import { plainParagraphs, sanitizeTaskHtml } from "../lib/safe-html";

const noop = () => () => {};

/**
 * Intro paragraph on the first screen. Older plain text renders as paragraphs.
 * Styled intros arrive already sanitized by the server and are cleaned again in the browser once it is ready.
 */
export function IntroBody({ body }: { body: string }) {
  const isClient = useSyncExternalStore(noop, () => true, () => false);
  const cls = `mt-3.5 text-base leading-normal text-muted ${INTRO_PROSE}`;
  if (introIsHtml(body)) return <div className={cls} dangerouslySetInnerHTML={{ __html: isClient ? sanitizeTaskHtml(body) : body }} />;
  return (
    <div className={cls}>
      {plainParagraphs(body).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
