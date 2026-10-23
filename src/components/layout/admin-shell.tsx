import { ADMIN_BASE_PATH } from "@/features/admin-access";
import type { ReactNode } from "react";
import Link from "next/link";
import { FlaskConical, LayoutGrid, LogOut, Settings, ShieldCheck, Table2, UserX, Columns3 } from "lucide-react";
import { Logo } from "@/components/brand";
import { cn } from "@/shared/cn";

export type AdminNavKey = "projects" | "board" | "dnf" | "table" | "settings" | "test";

type ShellProps = {
  active: AdminNavKey;
  /** When set, the project sub-nav (Board, Did not finish, Table, Settings) shows. */
  project?: { slug: string; name: string; boardCount?: number; dnfCount?: number };
  children: ReactNode;
};

function NavLink({ href, active, icon, children, count }: { href: string; active?: boolean; icon: ReactNode; children: ReactNode; count?: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-[38px] items-center gap-2.5 rounded-md pl-3 pr-2.5 text-sm transition-colors",
        active ? "bg-white/[0.09] font-bold text-white" : "font-semibold text-side-text hover:bg-white/5 hover:text-white",
      )}
    >
      <span className="inline-flex shrink-0 [&>svg]:size-[17px]">{icon}</span>
      {children}
      {count !== undefined && <span className="ml-auto text-xs font-bold text-side-muted">{count}</span>}
    </Link>
  );
}

/** Charcoal sidebar + ivory content area. Dense, red only for main actions and alerts. */
export function AdminShell({ active, project, children }: ShellProps) {
  const base = project ? `${ADMIN_BASE_PATH}/p/${project.slug}` : "";
  return (
    <div className="flex min-h-dvh bg-ivory">
      <nav aria-label="Admin" className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col bg-charcoal px-3.5 py-5 text-white lg:flex">
        <div className="px-1.5 pb-[22px]">
          <Logo height={22} />
          <p className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-side-muted">Hire</p>
        </div>
        <div className="flex flex-col gap-0.5">
          <NavLink href={ADMIN_BASE_PATH} active={active === "projects"} icon={<LayoutGrid />}>
            Projects
          </NavLink>
          {project && (
            <>
              <p className="mb-1.5 ml-3 mt-4 text-[11px] font-extrabold uppercase tracking-[0.12em] text-side-muted">{project.name}</p>
              <NavLink href={base} active={active === "board"} icon={<Columns3 />} count={project.boardCount}>
                Board
              </NavLink>
              <NavLink href={`${base}?tab=dnf`} active={active === "dnf"} icon={<UserX />} count={project.dnfCount}>
                Did not finish
              </NavLink>
              <NavLink href={`${base}?tab=table`} active={active === "table"} icon={<Table2 />}>
                Table
              </NavLink>
              <NavLink href={`${base}/settings`} active={active === "settings"} icon={<Settings />}>
                Settings
              </NavLink>
            </>
          )}
          <div className="h-4" />
          <NavLink href={`${ADMIN_BASE_PATH}/test`} active={active === "test"} icon={<FlaskConical />}>
            Test console
          </NavLink>
        </div>
        <div className="mt-auto rounded-[10px] bg-white/5 p-3 text-xs leading-snug text-[#8e94a2]">
          <p className="flex gap-2">
            <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden />
            This device stays signed in for 30 days.
          </p>
          <form action={`${ADMIN_BASE_PATH}/logout`} method="post" className="mt-2">
            <button type="submit" className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 font-bold text-side-text hover:bg-white/5 hover:text-white">
              <LogOut className="size-3.5" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileBar active={active} project={project} />
        {children}
      </div>
    </div>
  );
}

/** Below 1024px the sidebar becomes a top bar. Matt works on a laptop, so this only needs to be usable. */
function MobileBar({ active, project }: Omit<ShellProps, "children">) {
  const base = project ? `${ADMIN_BASE_PATH}/p/${project.slug}` : "";
  const items: { key: AdminNavKey; href: string; label: string }[] = [
    { key: "projects", href: ADMIN_BASE_PATH, label: "Projects" },
    ...(project
      ? [
          { key: "board" as const, href: base, label: "Board" },
          { key: "dnf" as const, href: `${base}?tab=dnf`, label: "Did not finish" },
          { key: "table" as const, href: `${base}?tab=table`, label: "Table" },
          { key: "settings" as const, href: `${base}/settings`, label: "Settings" },
        ]
      : []),
    { key: "test", href: `${ADMIN_BASE_PATH}/test`, label: "Test console" },
  ];
  return (
    <nav aria-label="Admin" className="flex items-center gap-1 overflow-x-auto bg-charcoal px-3 py-2.5 lg:hidden">
      <Logo height={18} className="mr-3 shrink-0 text-white" />
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href}
          aria-current={active === i.key ? "page" : undefined}
          className={cn("h-9 shrink-0 rounded-md px-3 text-[13px] leading-9", active === i.key ? "bg-white/10 font-bold text-white" : "font-semibold text-side-text")}
        >
          {i.label}
        </Link>
      ))}
      <form action={`${ADMIN_BASE_PATH}/logout`} method="post" className="ml-auto shrink-0">
        <button type="submit" className="h-9 rounded-md px-3 text-[13px] font-semibold text-side-text hover:bg-white/5 hover:text-white">
          Sign out
        </button>
      </form>
    </nav>
  );
}

/** Page header: crumb, display title, optional right-hand actions, optional tab row. */
export function PageHeader({
  crumb,
  title,
  actions,
  tabs,
}: {
  crumb?: ReactNode;
  title: string;
  actions?: ReactNode;
  tabs?: { href: string; label: string; active?: boolean }[];
}) {
  return (
    <header className="bg-white">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-7 pb-[18px] pt-[22px]">
        <div>
          {crumb && <p className="mb-1 text-[12.5px] font-semibold text-subtle">{crumb}</p>}
          <h1 className="text-[32px] leading-none">{title}</h1>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {tabs && (
        <div className="flex overflow-x-auto border-b border-line px-4 sm:px-7">
          {tabs.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className={cn(
                "mr-[22px] inline-flex h-[42px] shrink-0 items-center whitespace-nowrap border-b-2 px-0.5 text-sm",
                t.active ? "border-charcoal font-extrabold text-charcoal" : "border-transparent font-semibold text-muted hover:text-charcoal",
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
