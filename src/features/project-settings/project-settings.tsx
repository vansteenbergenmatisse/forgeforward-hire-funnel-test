"use client";

import { AdminShell, PageHeader } from "@/components/layout";
import { GeneralTab } from "./tabs/general-tab";
import { MessagesTab } from "./tabs/messages-tab";
import { QuestionsTab } from "./tabs/questions-tab";
import { StagesTab } from "./tabs/stages-tab";
import { TaskTab } from "./tabs/task-tab";
import { ThankYouTab } from "./tabs/thankyou-tab";
import { VideoTab } from "./tabs/video-tab";
import { SavedIndicator } from "./ui/saved-indicator";
import { SETTINGS_TABS, type SettingsTab } from "./types";
import { useSettings } from "./use-settings";

function TabBody({ tab, api }: { tab: SettingsTab; api: ReturnType<typeof useSettings> }) {
  switch (tab) {
    case "general":
      return <GeneralTab api={api} />;
    case "questions":
      return <QuestionsTab api={api} />;
    case "video":
      return <VideoTab api={api} />;
    case "thankyou":
      return <ThankYouTab api={api} />;
    case "stages":
      return <StagesTab api={api} />;
    case "task":
      return <TaskTab api={api} />;
    case "messages":
      return <MessagesTab api={api} />;
  }
}

/** The whole settings screen for one project: shell, header with tabs, and the active tab. */
export function ProjectSettings({ slug, tab }: { slug: string; tab: SettingsTab }) {
  const api = useSettings(slug);
  const name = api.data.project.name || slug;
  return (
    <AdminShell active="settings" project={{ slug, name }}>
      <PageHeader
        crumb={name}
        title="Settings"
        actions={<SavedIndicator savedAt={api.savedAt} error={api.error} />}
        tabs={SETTINGS_TABS.map((t) => ({ href: `/admin/p/${slug}/settings?tab=${t.id}`, label: t.label, active: t.id === tab }))}
      />
      <main className="min-w-0 flex-1 px-7 py-6">
        {api.status === "ready" ? (
          <TabBody tab={tab} api={api} />
        ) : api.status === "notfound" || api.status === "error" ? (
          <p role="alert" className="max-w-xl text-[15px] font-semibold text-muted">
            {api.status === "notfound" ? "This project does not exist." : "Could not load the settings. Reload the page to try again."}
          </p>
        ) : (
          <div role="status" aria-label="Loading settings" className="h-80 animate-pulse rounded-xl border border-line bg-white" />
        )}
      </main>
    </AdminShell>
  );
}
