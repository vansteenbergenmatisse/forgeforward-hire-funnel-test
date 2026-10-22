"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { buildCalLink } from "@/features/bookings";
import { Button } from "@/components/ui";
import type { Channel, TemplateDef } from "@/features/projects";
import { cn } from "@/shared/cn";
import { CHANNELS, SAMPLE_APPLICANT, newTemplate, validateTemplate } from "../logic/templates";
import type { SettingsApi } from "../use-settings";
import { Card } from "../ui/card";
import { ChannelTabs } from "../ui/channel-tabs";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { TemplateEditor } from "../ui/template-editor";

export function MessagesTab({ api }: { api: SettingsApi }) {
  const { templates, project } = api.data;
  const [channel, setChannel] = useState<Channel>("email");
  const list = templates.filter((t) => t.channel === channel);
  const [selectedId, setSelectedId] = useState<string | null>(list[0]?.id ?? null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TemplateDef | null>(null);

  const selected = list.find((t) => t.id === selectedId) ?? list[0];
  const channelLabel = CHANNELS.find((c) => c.id === channel)?.label ?? "";
  const sample: Record<string, string> = {
    ...SAMPLE_APPLICANT,
    project_name: project.name,
    cal_link: buildCalLink({ calLink: project.calLink, firstName: "Sam", lastName: "Rivera", email: "sam@example.com", applicantId: "a_1042" }),
  };

  const patch = (id: string, p: Partial<TemplateDef>) => api.update((d) => ({ ...d, templates: d.templates.map((t) => (t.id === id ? { ...t, ...p } : t)) }));

  function add() {
    const id = crypto.randomUUID();
    api.update((d) => ({ ...d, templates: [...d.templates, newTemplate(channel, id, d.templates)] }));
    setSelectedId(id);
    setFreshId(id);
  }

  function confirmDelete() {
    if (!deleting) return;
    const rest = list.filter((t) => t.id !== deleting.id);
    api.update((d) => ({ ...d, templates: d.templates.filter((t) => t.id !== deleting.id) }));
    setSelectedId(rest[0]?.id ?? null);
    setDeleting(null);
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[380px_1fr]">
      <Card id="templates">
        <ChannelTabs
          value={channel}
          onChange={(c) => {
            setChannel(c);
            setSelectedId(templates.find((t) => t.channel === c)?.id ?? null);
            setFreshId(null);
          }}
        />
        <div id="channel-panel" role="tabpanel" aria-labelledby={`channel-tab-${channel}`} className="mt-4">
          {list.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line-strong p-4 text-[14.5px] leading-snug text-muted">No {channelLabel} templates yet. Add one so you can message applicants.</p>
          ) : (
            <ul aria-label={`${channelLabel} templates`} className="flex flex-col gap-1">
              {list.map((t) => {
                const on = selected?.id === t.id;
                const broken = Object.keys(validateTemplate(t)).length > 0;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setSelectedId(t.id);
                        setFreshId(null);
                      }}
                      className={cn("flex h-10 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-[14.5px]", on ? "bg-sand font-bold" : "font-semibold text-muted hover:bg-sand")}
                    >
                      <span className="truncate">{t.name.trim() || "Untitled template"}</span>
                      {broken && <span className="shrink-0 rounded-full bg-amber-tint px-2 py-0.5 text-[12px] font-bold text-amber">Needs attention</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <Button variant="secondary" className="mt-3" icon={<Plus className="size-4" />} onClick={add}>
            Add template
          </Button>
        </div>
      </Card>
      <Card title={selected ? `${selected.name.trim() || "Untitled template"} · ${channelLabel}` : `${channelLabel} templates`} id="template-editor">
        {selected ? (
          <TemplateEditor
            key={selected.id}
            template={selected}
            sample={sample}
            autoFocus={freshId === selected.id}
            onChange={(p) => patch(selected.id, p)}
            onDelete={() => setDeleting(selected)}
          />
        ) : (
          <p className="text-[14.5px] text-muted">Pick a template on the left, or add one.</p>
        )}
      </Card>
      <ConfirmDialog open={!!deleting} title={`Delete ${deleting?.name.trim() || "this template"}?`} confirmLabel="Delete template" tone="primary" onCancel={() => setDeleting(null)} onConfirm={confirmDelete}>
        <p>Messages already sent keep their text. You can add the template again later.</p>
      </ConfirmDialog>
    </div>
  );
}
