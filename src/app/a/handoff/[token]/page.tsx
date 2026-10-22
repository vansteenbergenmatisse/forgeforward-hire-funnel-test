import type { Metadata } from "next";
import { HandoffConfirm } from "./handoff-confirm";

// The token sits in the URL path, so the page must not leak it through the Referer header.
export const metadata: Metadata = { title: "Apply | Forge Forward", robots: { index: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function HandoffPage({ params }: PageProps<"/a/handoff/[token]">) {
  const { token } = await params;
  return <HandoffConfirm token={token} />;
}
