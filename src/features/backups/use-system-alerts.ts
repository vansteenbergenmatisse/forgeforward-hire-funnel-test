"use client";

import { useCallback, useEffect, useState } from "react";
import type { SystemAlert } from "./rules";

/** Red banner data from the server: unresolved system errors and the backup state. */
export function useSystemAlerts() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/system-alerts", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { alerts?: SystemAlert[] };
      setAlerts(data.alerts ?? []);
    } catch {
      /* a failed status read must not break the page */
    }
  }, []);

  useEffect(() => {
    let live = true;
    fetch("/api/admin/system-alerts", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ alerts?: SystemAlert[] }>) : null))
      .then((data) => {
        if (live && data) setAlerts(data.alerts ?? []);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const resolve = useCallback(
    async (id: string) => {
      setAlerts((a) => a.filter((x) => x.id !== id));
      try {
        await fetch("/api/admin/system-alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      } finally {
        void load();
      }
    },
    [load],
  );

  return { alerts, resolve };
}
