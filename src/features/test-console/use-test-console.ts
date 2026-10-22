"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { idleRows } from "./checks";
import { createHttpBackend } from "./http-backend";
import { createMockBackend } from "./mock-backend";
import { runSequence } from "./sequence";
import { summarize, summaryText } from "./summary";
import type { Channel, CheckRow, SendResult, TestDataCounts } from "./types";

export type ChannelFeedback = { state: "sending" } | ({ state: "done" } & SendResult);

export type DeleteStep = "idle" | "confirm" | "deleting" | "done";

export function useTestConsole() {
  const [rows, setRows] = useState<CheckRow[]>(idleRows);
  const [running, setRunning] = useState(false);
  const [everRun, setEverRun] = useState(false);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [feedback, setFeedback] = useState<Partial<Record<Channel, ChannelFeedback>>>({});
  const [counts, setCounts] = useState<TestDataCounts | null>(null);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>("idle");

  const aborter = useRef<AbortController | null>(null);

  // Real HTTP runner by default. NEXT_PUBLIC_TEST_CONSOLE=mock keeps the simulated one for front-end work without a backend.
  const [{ backend, mock, loadStatus }] = useState(() => {
    if (process.env.NEXT_PUBLIC_TEST_CONSOLE === "mock") {
      const m = createMockBackend();
      return { backend: m, mock: m, loadStatus: async () => null };
    }
    const h = createHttpBackend();
    return { backend: h, mock: null, loadStatus: h.loadStatus };
  });
  const [, setStatusTick] = useState(0);
  const changeSimulate = useCallback(
    (v: boolean) => {
      mock?.setSimulateFailure(v);
      setSimulateFailure(v);
    },
    [mock],
  );

  const refreshCounts = useCallback(() => backend.testData.counts().then(setCounts).catch(() => undefined), [backend]);

  useEffect(() => {
    let live = true;
    void loadStatus().then((st) => {
      if (!live) return;
      if (st) setCounts(st.counts);
      setStatusTick((n) => n + 1);
    });
    if (!mock) return () => {
      live = false;
      aborter.current?.abort();
    };
    backend.testData.counts().then((c) => live && setCounts(c));
    return () => {
      live = false;
      aborter.current?.abort();
    };
  }, [backend, loadStatus, mock]);

  const run = useCallback(async () => {
    if (running) return;
    aborter.current = new AbortController();
    setRunning(true);
    setEverRun(true);
    await runSequence(backend.runner, { signal: aborter.current.signal, onUpdate: setRows });
    setRunning(false);
    await refreshCounts();
    setDeleteStep((s) => (s === "done" ? "idle" : s));
  }, [backend, refreshCounts, running]);

  const sendTest = useCallback(
    async (channel: Channel) => {
      setFeedback((f) => ({ ...f, [channel]: { state: "sending" } }));
      const res = await backend.messenger.send(channel);
      setFeedback((f) => ({ ...f, [channel]: { state: "done", ...res } }));
    },
    [backend],
  );

  const askDelete = useCallback(() => {
    void refreshCounts();
    setDeleteStep("confirm");
  }, [refreshCounts]);

  const confirmDelete = useCallback(async () => {
    setDeleteStep("deleting");
    try {
      setCounts(await backend.testData.deleteAll());
    } catch {
      await refreshCounts();
    }
    setDeleteStep("done");
  }, [backend, refreshCounts]);

  const summary = useMemo(() => summarize(rows), [rows]);

  return {
    rows,
    running,
    everRun,
    summary,
    announcement: running ? "Running the full test." : summaryText(summary, everRun),
    simulateFailure,
    setSimulateFailure: mock ? changeSimulate : undefined,
    run,
    feedback,
    sendTest,
    target: backend.messenger.target(),
    modes: backend.messenger.modes(),
    counts,
    deleteStep,
    askDelete,
    cancelDelete: () => setDeleteStep("idle"),
    confirmDelete,
  };
}
