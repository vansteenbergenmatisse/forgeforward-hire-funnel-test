"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui";
import { controlClass } from "@/components/forms";

/** Small inline form under the toolbar: one URL, optional alt text, Apply and Cancel. Used for links and images. */
export function UrlBar({
  kind,
  initialUrl = "",
  canRemove,
  validate,
  onApply,
  onRemove,
  onCancel,
}: {
  kind: "link" | "image";
  initialUrl?: string;
  canRemove?: boolean;
  validate: (raw: string) => string | null;
  onApply: (url: string, alt: string) => void;
  onRemove?: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [url, setUrl] = useState(initialUrl);
  const [alt, setAlt] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const err = validate(url);
    setError(err);
    if (!err) onApply(url, alt);
  }

  return (
    <div
      role="group"
      aria-label={kind === "link" ? "Add link" : "Add image by URL"}
      className="flex flex-wrap items-start gap-2 border-b border-line bg-sand px-3 py-2.5"
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      }}
    >
      <div className="min-w-56 flex-1">
        <label htmlFor={`${id}-u`} className="sr-only">
          {kind === "link" ? "Link address" : "Image address"}
        </label>
        <input
          id={`${id}-u`}
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={kind === "link" ? "https://example.com" : "https://example.com/picture.png"}
          aria-invalid={error ? true : undefined}
          className={`${controlClass(!!error)} h-9 text-[14px]`}
        />
        {error && (
          <p role="alert" className="mt-1 text-[13px] font-semibold text-signal-deep">
            {error}
          </p>
        )}
      </div>
      {kind === "image" && (
        <div className="min-w-40 flex-1">
          <label htmlFor={`${id}-a`} className="sr-only">
            Image description
          </label>
          <input id={`${id}-a`} value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe the image" className={`${controlClass(false)} h-9 text-[14px]`} />
        </div>
      )}
      <Button size="md" variant="dark" onClick={submit} className="h-9">
        {kind === "link" ? "Apply link" : "Insert image"}
      </Button>
      {canRemove && (
        <Button size="md" variant="secondary" onClick={onRemove} className="h-9">
          Remove link
        </Button>
      )}
      <Button size="md" variant="ghost" onClick={onCancel} className="h-9">
        Cancel
      </Button>
    </div>
  );
}
