"use client";

import { useTestConsole } from "../use-test-console";
import { FullTestCard } from "./full-test-card";
import { SendTestCard } from "./send-test-card";
import { TestDataCard } from "./test-data-card";

export function TestConsole() {
  const c = useTestConsole();
  return (
    <div className="grid items-start gap-5 px-7 py-[22px] xl:grid-cols-[1fr_380px]">
      <p role="status" aria-live="polite" className="sr-only">
        {c.announcement}
      </p>
      <FullTestCard
        rows={c.rows}
        summary={c.summary}
        running={c.running}
        everRun={c.everRun}
        subtitle={c.announcement}
        simulateFailure={c.simulateFailure}
        onSimulateChange={c.setSimulateFailure}
        onRun={c.run}
      />
      <div className="flex flex-col gap-4">
        <SendTestCard target={c.target} modes={c.modes} feedback={c.feedback} onSend={c.sendTest} />
        <TestDataCard counts={c.counts} step={c.deleteStep} onAsk={c.askDelete} onCancel={c.cancelDelete} onConfirm={c.confirmDelete} />
      </div>
    </div>
  );
}
