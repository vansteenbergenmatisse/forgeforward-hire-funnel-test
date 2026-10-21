import { Logo } from "@/components/brand";

/** Full-page message: unknown slug, closed project. */
export function FunnelNotice({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-ivory px-5 pt-3.5 text-charcoal">
      <Logo height={22} />
      <main className="flex flex-1 flex-col items-center justify-center pb-24 text-center">
        <h1 className="text-[34px] leading-[0.98] md:text-[44px]">{title}</h1>
        {body && <p className="mt-3 max-w-md text-base leading-normal text-muted">{body}</p>}
      </main>
    </div>
  );
}
