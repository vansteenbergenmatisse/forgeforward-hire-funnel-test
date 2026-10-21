"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

/** How many applicant cards sit in a stage. The board worker's real store can replace the mock. */
export interface StageUsage {
  countCardsInStage(stageId: string): number;
  /** Called after a stage is deleted so the owner of the cards can move them. */
  moveCards(fromStageId: string, toStageId: string): void;
}

const MOCK_COUNTS: Record<string, number> = {
  "st-new": 9,
  "st-task": 5,
  "st-booked": 3,
  "st-interviewed": 2,
  "st-trial": 1,
  "st-hired": 1,
  "st-rejected": 3,
};

export function createMockStageUsage(): StageUsage {
  const counts = new Map(Object.entries(MOCK_COUNTS));
  return {
    countCardsInStage: (id) => counts.get(id) ?? 0,
    moveCards(from, to) {
      counts.set(to, (counts.get(to) ?? 0) + (counts.get(from) ?? 0));
      counts.delete(from);
    },
  };
}

const StageUsageContext = createContext<StageUsage | null>(null);

export function StageUsageProvider({ value, children }: { value: StageUsage; children: ReactNode }) {
  return <StageUsageContext.Provider value={value}>{children}</StageUsageContext.Provider>;
}

/** Uses the provider when present, otherwise a per-screen mock. */
export function useStageUsage(): StageUsage {
  const ctx = useContext(StageUsageContext);
  const fallback = useMemo(() => createMockStageUsage(), []);
  return ctx ?? fallback;
}
