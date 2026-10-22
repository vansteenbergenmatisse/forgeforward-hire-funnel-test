import type { Metadata } from "next";
import { Logo } from "@/components/brand";
import { LoginForm } from "@/features/admin-access/login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-ivory px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <Logo height={28} className="text-charcoal" />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-extrabold uppercase leading-none text-charcoal">Dashboard</h1>
          <p className="text-base text-subtle">Enter the password to continue.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
