"use client";

import { useEffect } from "react";
import { ErrorScreen, digestOf } from "@/components/layout/error-screen";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = digestOf(error);
  return (
    <ErrorScreen
      title="Something went wrong"
      body="The page did not load. Try again, or reload the page."
      retry={retry}
      digest={digest}
    />
  );
}
