import { AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/shared/cn";
import { formatMs } from "../summary";
import type { CheckRow as Row } from "../types";

function StatusPill({ status }: { status: Row["status"] }) {
  if (status === "pass") return <Badge tone="green" dot>Pass</Badge>;
  if (status === "fail")
    return (
      <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-signal px-2 text-[12.5px] font-bold text-white">
        <span className="size-1.5 rounded-full bg-white" />
        Fail
      </span>
    );
  if (status === "running")
    return (
      <Badge tone="blue">
        <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden />
        Running
      </Badge>
    );
  return <Badge tone="gray">Waiting</Badge>;
}

export function CheckRowItem({ row, index }: { row: Row; index: number }) {
  const note = row.status === "fail" ? row.error : row.status === "pass" ? row.detail : undefined;
  return (
    <li
      aria-busy={row.status === "running"}
      className={cn(
        "grid grid-cols-[26px_1fr_64px_84px] items-center gap-3 border-t border-line px-4 py-[9px]",
        row.status === "running" && "bg-blue-tint/40",
        row.status === "fail" && "bg-signal-tint/40",
      )}
    >
      <span className="text-[12.5px] font-extrabold text-subtle">{index + 1}</span>
      <span className="text-sm font-semibold">
        {row.label}
        {note && (
          <span className={cn("mt-0.5 flex items-start gap-1.5 text-[12.5px]", row.status === "fail" ? "font-bold text-signal-deep" : "font-normal text-muted")}>
            {row.status === "fail" && <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />}
            {note}
          </span>
        )}
      </span>
      <span className="text-right text-[12.5px] tabular-nums text-muted">{row.ms !== undefined ? formatMs(row.ms) : ""}</span>
      <span className="flex justify-end">
        <StatusPill status={row.status} />
      </span>
    </li>
  );
}
