"use client";

import { useState } from "react";
import { setRemoteStatus } from "@/features/projects/client";
import { showToast } from "./toast";

/** Changes the status and shows a short confirmation with Undo. Returns the error text, or null on success. */
async function change(slug: string, name: string, status: "open" | "closed", withUndo: boolean): Promise<string | null> {
  try {
    await setRemoteStatus(slug, status);
    showToast(
      status === "closed" ? `${name} is inactive. Its link now shows a closed notice.` : `${name} is active again. The link takes applications.`,
      withUndo ? () => void change(slug, name, status === "closed" ? "open" : "closed", false) : undefined,
    );
    return null;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not change the project.";
    showToast(message);
    return message;
  }
}

/** Deactivate and reactivate for one project, with a short confirmation that offers Undo. Both are reversible, so neither asks first. */
export function useProjectLifecycle(slug: string, name: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(status: "open" | "closed") {
    setBusy(true);
    setError(null);
    setError(await change(slug, name, status, true));
    setBusy(false);
  }

  return { busy, error, deactivate: () => run("closed"), reactivate: () => run("open") };
}
