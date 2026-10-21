"use client";

import { Mail, MessageCircle, MessageSquare } from "lucide-react";
import type { Channel } from "@/features/projects";
import { cn } from "@/shared/cn";
import { CHANNELS } from "../logic/templates";

const ICONS: Record<Channel, typeof Mail> = { email: Mail, whatsapp: MessageCircle, sms: MessageSquare };

/** Pill tabs: Email, WhatsApp, SMS. Arrow keys move between them. */
export function ChannelTabs({ value, onChange }: { value: Channel; onChange: (c: Channel) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Channel"
      className="flex flex-wrap gap-1.5"
      onKeyDown={(e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const i = CHANNELS.findIndex((c) => c.id === value);
        const next = CHANNELS[(i + (e.key === "ArrowRight" ? 1 : CHANNELS.length - 1)) % CHANNELS.length];
        onChange(next.id);
        requestAnimationFrame(() => document.getElementById(`channel-tab-${next.id}`)?.focus());
      }}
    >
      {CHANNELS.map((c) => {
        const Icon = ICONS[c.id];
        const on = c.id === value;
        return (
          <button
            key={c.id}
            id={`channel-tab-${c.id}`}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls="channel-panel"
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(c.id)}
            className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-bold", on ? "border-charcoal bg-charcoal text-white" : "border-line-strong bg-white hover:bg-sand")}
          >
            <Icon className="size-4" aria-hidden />
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
