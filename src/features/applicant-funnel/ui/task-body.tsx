"use client";

import { useSyncExternalStore } from "react";
import { looksLikeHtml, plainParagraphs, sanitizeTaskHtml } from "../lib/safe-html";

const noop = () => () => {};

/** Task instructions. Plain text renders as paragraphs. HTML from the Task editor is sanitized first. */
export function TaskBody({ body }: { body: string }) {
  const isClient = useSyncExternalStore(noop, () => true, () => false);
  const prose =
    "text-base leading-[1.55] [&_a]:font-semibold [&_a]:text-signal-deep [&_a]:underline [&_h1]:mb-2 [&_h1]:text-2xl [&_h2]:mb-2 [&_h2]:text-xl [&_img]:my-3 [&_img]:rounded-lg [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p:not(:first-child)]:mt-3 [&_ul]:list-disc [&_ul]:pl-5";

  if (looksLikeHtml(body)) {
    if (!isClient) return <div className={prose} />;
    return <div className={prose} dangerouslySetInnerHTML={{ __html: sanitizeTaskHtml(body) }} />;
  }
  return (
    <div className={prose}>
      {plainParagraphs(body).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
