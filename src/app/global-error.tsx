"use client";

import "./globals.css";
import { ErrorScreen, digestOf } from "@/components/layout/error-screen";

export default function GlobalError({ error }: { error: unknown }) {
  const digest = digestOf(error);
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <ErrorScreen
          title="Something went wrong"
          body="The page did not load. Reload the page to continue."
          digest={digest}
        />
      </body>
    </html>
  );
}
