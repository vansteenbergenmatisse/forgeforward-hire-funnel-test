import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ivory px-6 text-center text-charcoal">
      <h1 className="font-display text-3xl uppercase">Page not found</h1>
      <p className="max-w-sm text-base text-muted">This link does not lead anywhere. Check the address and try again.</p>
      <Link
        href="/"
        className="inline-flex h-12 w-full max-w-xs items-center justify-center rounded-xl bg-signal px-6 text-base font-bold text-white hover:bg-signal-deep"
      >
        Go to the start
      </Link>
    </main>
  );
}
