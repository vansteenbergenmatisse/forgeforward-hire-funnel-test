import type { Metadata } from "next";
import { FunnelNotice, ThankYouPage } from "@/features/applicant-funnel";
import { getFunnelProject } from "@/features/applicant-funnel/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Thank you | Forge Forward", robots: { index: false } };

export default async function ThanksPage({ params }: PageProps<"/a/[slug]/thanks">) {
  const { slug } = await params;
  const project = await getFunnelProject(slug);
  if (!project) return <FunnelNotice title="This page does not exist." />;
  return <ThankYouPage project={project} />;
}
