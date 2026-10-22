import type { Metadata } from "next";
import { FunnelNotice, HandoffLanding } from "@/features/applicant-funnel";
import { consumeHandoff } from "@/features/applicant-funnel/server";

export const metadata: Metadata = { title: "Apply | Forge Forward", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function HandoffPage({ params }: PageProps<"/a/handoff/[token]">) {
  const { token } = await params;
  const hand = await consumeHandoff(token);
  if (!hand) return <FunnelNotice title="This link has expired." />;
  return <HandoffLanding slug={hand.slug} resumeToken={hand.resumeToken} applicantId={hand.applicantId} firstName={hand.firstName} />;
}
