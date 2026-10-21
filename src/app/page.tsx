import { Logo } from "@/components/brand";

export default function Home() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ivory px-6 text-center text-charcoal">
      <div className="flex flex-col items-center gap-4">
        <Logo height={28} />
        <p className="text-base text-muted">Open the link for the job you want to apply to.</p>
      </div>
    </main>
  );
}
