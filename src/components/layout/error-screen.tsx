"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  body: string;
  /** Re-renders the failed part. Omit when only a full reload makes sense. */
  retry?: () => void;
  /** Reference to quote when asking for help. */
  digest?: string;
};

/** Next adds a `digest` to errors thrown on the server. Anything else has none. */
export function digestOf(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "digest" in error && typeof error.digest === "string") return error.digest;
  return undefined;
}

/** Full-page fallback for error boundaries and missing pages. A reload fixes failed script downloads that retry cannot. */
export function ErrorScreen({ title, body, retry, digest }: Props) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ivory px-6 text-center text-charcoal">
      <h1 className="font-display text-3xl uppercase">{title}</h1>
      <p className="max-w-sm text-base text-muted">{body}</p>
      <div className="flex w-full max-w-xs flex-col gap-3">
        {retry ? (
          <Button size="lg" onClick={retry} icon={<RefreshCw className="size-4" aria-hidden />}>
            Try again
          </Button>
        ) : null}
        <Button size="lg" variant={retry ? "secondary" : "primary"} onClick={() => window.location.reload()}>
          Reload the page
        </Button>
      </div>
      {digest ? <p className="text-xs text-subtle">Reference: {digest}</p> : null}
    </main>
  );
}
