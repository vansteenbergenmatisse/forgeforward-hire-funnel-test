import { AlertTriangle } from "lucide-react";
import { AdminShell } from "@/components/layout";
import { Button } from "@/components/ui";

/** Shown instead of the board when nothing could be loaded. Not the same as "project not found". */
export function LoadError({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <AdminShell active="projects">
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center" role="alert">
          <span className="flex size-12 items-center justify-center rounded-full bg-signal-tint text-signal-deep">
            <AlertTriangle className="size-6" aria-hidden />
          </span>
          <h1 className="text-[28px] leading-none">{title}</h1>
          <p className="text-sm text-muted">{message}</p>
          <Button variant="dark" onClick={onRetry} className="mt-2">
            Try again
          </Button>
        </div>
      </main>
    </AdminShell>
  );
}
