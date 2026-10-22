import { MOCK_PROJECT, MOCK_QUESTIONS, MOCK_STAGES, MOCK_TEMPLATES } from "@/features/projects";
import type { ProjectRecord, SystemAlert, UnmatchedBooking } from "./types";

const SALES_REP: ProjectRecord = {
  def: {
    ...MOCK_PROJECT,
    slug: "sales-rep",
    name: "Sales Rep",
    intro: "Close warm leads for a home services agency. Full time, remote, commission on top of base.",
    videoPrompt: "Introduce yourself in 60 seconds. Who are you? Where do you live? Why would you be a great sales rep?",
    taskEnabled: false,
    calLink: "https://cal.com/forgeforward/sales-interview",
  },
  questions: [
    {
      id: "q-sales-years",
      label: "How many years have you worked in sales?",
      helpText: "",
      type: "single_choice",
      options: ["None", "Less than 1 year", "1 to 2 years", "3 to 5 years", "More than 5 years"],
      required: true,
      archived: false,
    },
  ],
  stages: MOCK_STAGES,
  templates: MOCK_TEMPLATES,
};

export const INITIAL_PROJECTS: ProjectRecord[] = [
  { def: MOCK_PROJECT, questions: MOCK_QUESTIONS, stages: MOCK_STAGES, templates: MOCK_TEMPLATES },
  SALES_REP,
];

export const INITIAL_BOOKINGS: UnmatchedBooking[] = [
  { id: "ub-1", email: "j.morales.work@gmail.com", title: "Interview", start: "2026-10-29T14:00:00Z", when: "Thu Oct 29, 10:00 AM ET" },
];

export const INITIAL_ALERTS: SystemAlert[] = [
  { id: "al-backup", title: "No backup in the last 26 hours.", detail: "The 04:00 UTC backup did not run. Open the test console to check it.", resolved: false },
];

