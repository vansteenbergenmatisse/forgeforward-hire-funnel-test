"use client";
import { ADMIN_BASE_PATH } from "@/features/admin-access";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";
import type { SystemAlert } from "../types";

/** Red banner for an unresolved system error or a missing backup. Resolving clears it. */
export function AlertBanner({ alert, onResolve }: { alert: SystemAlert; onResolve?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-signal px-4 py-3 text-sm font-semibold text-white">
      <AlertTriangle className="size-[18px] shrink-0" aria-hidden />
      <span>
        <b>{alert.title}</b> {alert.detail}
      </span>
      <span className="ml-auto flex items-center gap-2">
        <Link href={`${ADMIN_BASE_PATH}/test`} className="inline-flex h-8 items-center rounded-lg bg-white px-3 text-[13px] font-extrabold text-signal-deep hover:bg-ivory">
          Open test console
        </Link>
        {onResolve ? (
          <Button variant="ghost" size="sm" onClick={onResolve} className="text-white hover:bg-white/15">
            Mark resolved
          </Button>
        ) : null}
      </span>
    </div>
  );
}
