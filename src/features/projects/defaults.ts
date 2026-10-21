import type { STAGE_ROLES } from "@/platform/db/schema";

export const DEFAULT_STAGES: {
  name: string;
  color: string;
  isPositive: boolean;
  role: (typeof STAGE_ROLES)[number] | null;
}[] = [
  { name: "New", color: "gray", isPositive: false, role: "entry_new" },
  { name: "Did task", color: "blue", isPositive: false, role: "entry_task" },
  { name: "Interview booked", color: "amber", isPositive: true, role: "on_booking" },
  { name: "Interviewed", color: "purple", isPositive: true, role: null },
  { name: "Trial", color: "teal", isPositive: true, role: null },
  { name: "Hired", color: "green", isPositive: true, role: null },
  { name: "Rejected", color: "red", isPositive: false, role: null },
];

export const DEFAULT_THANK_YOU =
  "Thanks, {first_name}. We got your application. We watch every video ourselves. If you fit the role, we reach out on WhatsApp or email within {reply_days} days.";

export const DEFAULT_TEMPLATE = {
  name: "Interview invite",
  subject: "Your Forge Forward interview",
  body: "Hi {first_name}, thanks for your video. We'd like to meet you. Pick a time here: {cal_link} Talk soon, Matt (Forge Forward)",
} as const;

export const APPOINTMENT_SETTER = {
  slug: "appointment-setter",
  name: "Appointment Setter",
  intro:
    "Book calls with warm, inbound leads for a marketing agency that helps US landscapers. Part-time and remote, Mon to Fri, 1 to 5 PM ET. No cold outreach.",
  videoPrompt:
    "Introduce yourself in 60 seconds. Who are you? Where do you live? Why would you be a great appointment setter?",
  taskTitle: "Optional task: your first text",
  taskText:
    "A landscaping company owner just filled in our form. Write the first text you'd send him. Your goal is to get him on a call.",
  question: {
    label: "How many years have you done appointment setting?",
    options: ["None", "Less than 1 year", "1 to 2 years", "3 to 5 years", "More than 5 years"],
  },
} as const;

/** Tiptap JSON for a plain paragraph. */
export function paragraphDoc(text: string) {
  return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
}
