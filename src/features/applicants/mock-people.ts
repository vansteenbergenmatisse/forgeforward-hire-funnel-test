/** Compact seed rows for the made-up applicants. Expanded into full ApplicantView objects in mock.ts. */
export type Seed = {
  f: string;
  l: string;
  cc: "PH" | "ZA" | "US";
  /** Answer to the single-choice question. */
  years: string;
  /** Stage id from MOCK_STAGES, or null for "Did not finish". */
  stage: string | null;
  /** Hours before MOCK_NOW that the application started. */
  h: number;
  tz?: string;
  audio?: boolean;
  task?: "text" | "link" | "file";
  before?: boolean;
  score?: number;
  notes?: string;
  booking?: "booked" | "cancelled" | "rescheduled";
  unread?: boolean;
  /** For "Did not finish" rows. */
  progress?: "form" | "video";
  videoDeleted?: boolean;
  noWhatsapp?: boolean;
  retake?: boolean;
};

const D = 24;

export const APPOINTMENT_SETTER_SEEDS: Seed[] = [
  // New (9)
  { f: "Maria", l: "Santos", cc: "PH", years: "3 to 5 years", stage: "st-new", h: 2 },
  { f: "Thabo", l: "Nkosi", cc: "ZA", years: "1 to 2 years", stage: "st-new", h: 5, audio: true },
  { f: "Kevin", l: "Brooks", cc: "US", years: "More than 5 years", stage: "st-new", h: 1 * D + 3, tz: "America/Chicago" },
  { f: "Joy", l: "Dela Cruz", cc: "PH", years: "Less than 1 year", stage: "st-new", h: 1 * D + 8 },
  { f: "Andre", l: "Cruz", cc: "PH", years: "1 to 2 years", stage: "st-new", h: 2 * D + 1, score: 3 },
  { f: "Lindiwe", l: "Zulu", cc: "ZA", years: "3 to 5 years", stage: "st-new", h: 2 * D + 6 },
  { f: "Tyler", l: "Reed", cc: "US", years: "None", stage: "st-new", h: 3 * D + 2 },
  { f: "Jessa", l: "Ramos", cc: "PH", years: "Less than 1 year", stage: "st-new", h: 3 * D + 9, noWhatsapp: true },
  { f: "Pieter", l: "Vos", cc: "ZA", years: "1 to 2 years", stage: "st-new", h: 4 * D + 4 },
  // Did task (5)
  { f: "Lerato", l: "Mokoena", cc: "ZA", years: "3 to 5 years", stage: "st-task", h: 2 * D + 22, task: "text", score: 4, retake: true, unread: true, notes: "Clear voice, good energy. Strong first text. Ask about evening availability." },
  { f: "Mark", l: "Villanueva", cc: "PH", years: "1 to 2 years", stage: "st-task", h: 2 * D + 20, task: "link", before: true },
  { f: "Chris", l: "Allen", cc: "US", years: "3 to 5 years", stage: "st-task", h: 3 * D + 16, task: "file", score: 5 },
  { f: "Nadia", l: "Pillay", cc: "ZA", years: "More than 5 years", stage: "st-task", h: 5 * D + 2, task: "text", score: 4 },
  { f: "Ken", l: "Morales", cc: "PH", years: "1 to 2 years", stage: "st-task", h: 6 * D + 5, task: "text" },
  // Interview booked (3)
  { f: "Paolo", l: "Garcia", cc: "PH", years: "More than 5 years", stage: "st-booked", h: 4 * D + 19, task: "text", booking: "booked", score: 5 },
  { f: "Sipho", l: "Dlamini", cc: "ZA", years: "3 to 5 years", stage: "st-booked", h: 5 * D + 12, booking: "cancelled", score: 3 },
  { f: "Emily", l: "Ward", cc: "US", years: "1 to 2 years", stage: "st-booked", h: 6 * D + 10, task: "text", booking: "rescheduled", tz: "America/Los_Angeles" },
  // Interviewed (2)
  { f: "Grace", l: "Tan", cc: "PH", years: "3 to 5 years", stage: "st-interviewed", h: 6 * D + 14, task: "text", score: 4 },
  { f: "Miguel", l: "Torres", cc: "PH", years: "More than 5 years", stage: "st-interviewed", h: 8 * D + 3, score: 4 },
  // Trial (1), Hired (1)
  { f: "Daniel", l: "Moore", cc: "US", years: "More than 5 years", stage: "st-trial", h: 7 * D + 9, task: "text", score: 5 },
  { f: "Hannah", l: "Lee", cc: "US", years: "3 to 5 years", stage: "st-hired", h: 29 * D, task: "text", score: 5, notes: "Hired. Starts Monday." },
  // Rejected (3)
  { f: "Rhea", l: "Lim", cc: "PH", years: "None", stage: "st-rejected", h: 27 * D + 6 },
  { f: "Jon", l: "Pratt", cc: "US", years: "Less than 1 year", stage: "st-rejected", h: 40 * D, videoDeleted: true },
  { f: "Zanele", l: "Dube", cc: "ZA", years: "None", stage: "st-rejected", h: 11 * D, score: 1 },
  // Did not finish (7)
  { f: "Ana", l: "Reyes", cc: "PH", years: "1 to 2 years", stage: null, h: 0.5 * D, progress: "video" },
  { f: "Brian", l: "Cole", cc: "US", years: "None", stage: null, h: 0.2 * D + 4, progress: "form" },
  { f: "Nomsa", l: "Khumalo", cc: "ZA", years: "3 to 5 years", stage: null, h: 1 * D + 10, progress: "video" },
  { f: "Leo", l: "Ramos", cc: "PH", years: "Less than 1 year", stage: null, h: 1 * D + 18, progress: "form" },
  { f: "Tasha", l: "Green", cc: "US", years: "1 to 2 years", stage: null, h: 2 * D + 20, progress: "form" },
  { f: "Carlo", l: "Reyes", cc: "PH", years: "More than 5 years", stage: null, h: 3 * D + 2, progress: "video" },
  { f: "Peter", l: "Botha", cc: "ZA", years: "None", stage: null, h: 4 * D + 12, progress: "form" },
];

export const SALES_REP_SEEDS: Seed[] = [
  { f: "Oliver", l: "Hayes", cc: "US", years: "3 to 5 years", stage: "st-new", h: 6 },
  { f: "Carmen", l: "Aquino", cc: "PH", years: "1 to 2 years", stage: "st-new", h: 1 * D + 5 },
  { f: "Sanele", l: "Mthembu", cc: "ZA", years: "More than 5 years", stage: "st-task", h: 2 * D + 2, task: "text", score: 4 },
  { f: "Rachel", l: "Kim", cc: "US", years: "3 to 5 years", stage: "st-booked", h: 4 * D, booking: "booked", task: "text" },
  { f: "Dennis", l: "Ocampo", cc: "PH", years: "Less than 1 year", stage: null, h: 1 * D + 1, progress: "form" },
];
