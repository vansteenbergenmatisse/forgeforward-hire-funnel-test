import type { Metadata } from "next";
import { DevReview, FunnelFlow, FunnelNotice, getFunnelProject, parseDevStep, parseSim, pickTracking } from "@/features/applicant-funnel";

export const metadata: Metadata = { title: "Apply | Forge Forward" };

export default async function ApplyPage({ params, searchParams }: PageProps<"/a/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const project = await getFunnelProject(slug);

  if (!project) return <FunnelNotice title="This page does not exist." />;
  // A closed project still opens for people who are mid-flow (spec G12). The flow shows the closed notice to everyone else.

  const tracking = pickTracking(query);
  const sim = parseSim(query.sim);
  const devStep = process.env.NODE_ENV !== "production" ? parseDevStep(query.step) : null;

  const videoStub = process.env.NODE_ENV !== "production" && query.video === "stub";

  if (devStep) return <DevReview step={devStep} project={project} tracking={tracking} sim={sim} />;
  return <FunnelFlow project={project} tracking={tracking} sim={sim} videoStub={videoStub} />;
}
