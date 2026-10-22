import { ADMIN_BASE_PATH } from "@/features/admin-access";
import Link from "next/link";
import { FolderSearch } from "lucide-react";
import { AdminShell } from "@/components/layout";

export function ProjectNotFound({ slug }: { slug: string }) {
  return (
    <AdminShell active="projects">
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-sand text-muted">
            <FolderSearch className="size-6" aria-hidden />
          </span>
          <h1 className="text-[28px] leading-none">Project not found</h1>
          <p className="text-sm text-muted">There is no project called &ldquo;{slug}&rdquo;. It may have been renamed or removed.</p>
          <Link href={ADMIN_BASE_PATH} className="mt-2 inline-flex h-10 items-center rounded-lg bg-charcoal px-4 text-sm font-bold text-white hover:bg-charcoal-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal">
            Back to projects
          </Link>
        </div>
      </main>
    </AdminShell>
  );
}
