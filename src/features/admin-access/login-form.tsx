"use client";

import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { Banner, Button } from "@/components/ui";
import { Field, TextInput } from "@/components/forms";
import { ADMIN_BASE_PATH } from "./path";

/** Posts the password to the login route. Signed in: full page load, so the new cookie is used at once. */
export function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${ADMIN_BASE_PATH}/login/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; next?: string } | null;
      if (res.ok && data?.ok) {
        window.location.assign(data.next ?? ADMIN_BASE_PATH);
        return;
      }
      setError(data?.error ?? "Could not sign in. Try again.");
    } catch {
      setError("Could not sign in. Try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {error && <Banner>{error}</Banner>}
      <Field label="Password" htmlFor="admin-password">
        <TextInput
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Button type="submit" size="lg" loading={busy} icon={<KeyRound className="size-4" aria-hidden />}>
        Sign in
      </Button>
    </form>
  );
}
