import Link from "next/link";
import { AdminShell, PageHeader } from "@/components/layout";

/** Placeholder while the browser store loads, so a new project never flashes "not found". */
export function PipelineSkeleton({ slug }: { slug: string }) {
  return (
    <AdminShell active="board" project={{ slug, name: slug }}>
      <PageHeader crumb={<Link href="/admin">Projects</Link>} title="Loading" />
      <main aria-busy="true" className="flex flex-1 gap-3 overflow-hidden px-7 py-[22px] motion-safe:animate-pulse">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="h-[420px] w-[244px] flex-none rounded-xl bg-sand" />
        ))}
      </main>
    </AdminShell>
  );
}
