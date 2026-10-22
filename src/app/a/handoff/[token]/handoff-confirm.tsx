"use client";

import { useState } from "react";
import { FunnelNotice, HandoffLanding } from "@/features/applicant-funnel";
import { Button } from "@/components/ui";
import { Logo } from "@/components/brand";
import { claimHandoff, type ClaimResult } from "./actions";

/** Asks for one tap before the one-time link is used. */
export function HandoffConfirm({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ClaimResult | null>(null);

  if (result?.ok) {
    return <HandoffLanding slug={result.slug} resumeToken={result.resumeToken} applicantId={result.applicantId} firstName={result.firstName} funnelStep={result.funnelStep} />;
  }
  if (result) return <FunnelNotice title="This link has expired." />;

  async function onContinue() {
    setBusy(true);
    try {
      setResult(await claimHandoff(token));
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center bg-ivory px-5 pt-3.5 text-charcoal">
      <Logo height={22} />
      <main className="flex flex-1 flex-col items-center justify-center pb-24 text-center">
        <h1 className="text-[34px] leading-[0.98] md:text-[44px]">Continue your application.</h1>
        <p className="mt-3 max-w-md text-base leading-normal text-muted">Tap the button to pick up where you left off.</p>
        <Button size="lg" className="mt-6 max-w-xs" loading={busy} onClick={onContinue}>
          Continue
        </Button>
      </main>
    </div>
  );
}
