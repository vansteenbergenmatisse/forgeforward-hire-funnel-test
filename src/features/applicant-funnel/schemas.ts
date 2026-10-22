import { z } from "zod";
import { parsePhone } from "@/shared/phone";

export const CONSENT_TEXT =
  "I agree that Forge Forward can contact me about this job by email, text and WhatsApp.";

/** Answer limits. The details form mirrors these so people see the problem before the server does. */
export const ANSWER_LIMITS = { shortText: 200, longText: 2000 } as const;

const TRACKING_KEYS = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"]);

function isTimeZone(v: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: v });
    return true;
  } catch {
    return false;
  }
}

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export const startSchema = z
  .object({
    projectSlug: z.string().min(1),
    firstName: z.string().trim().min(1, "Enter your first name").max(60),
    lastName: z.string().trim().min(1, "Enter your last name").max(60),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
    phone: z.string().trim().min(1, "Check your phone number"),
    phoneCountry: z.string().regex(/^[A-Za-z]{2}$/).optional(),
    whatsappOk: z.boolean(),
    timezone: z.string().min(1, "Pick your time zone").max(64).refine(isTimeZone, "Pick your time zone"),
    consent: z.literal(true, { error: "Tick the box to continue" }),
    answers: z
      .record(
        z.string().max(64),
        z.union([z.string().max(ANSWER_LIMITS.longText), z.number(), z.boolean(), z.array(z.string().max(200)).max(50)]),
      )
      .refine((a) => Object.keys(a).length <= 100, "Too many answers")
      .default({}),
    // Only the tracking keys the funnel sends are kept. Anything else is dropped.
    utm: z
      .record(z.string().max(40), z.string().max(200))
      .transform((u) => Object.fromEntries(Object.entries(u).filter(([k]) => TRACKING_KEYS.has(k))))
      .default({}),
    inAppBrowser: z.boolean().default(false),
    website: z.string().max(200).optional(), // honeypot
  })
  .transform((v, ctx) => {
    const phone = parsePhone(v.phone, v.phoneCountry);
    if (!phone) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Check your phone number" });
      return z.NEVER;
    }
    return { ...v, phoneE164: phone.e164, phoneCountry: phone.country };
  });

export type StartInput = z.input<typeof startSchema>;

export const taskSchema = z
  .object({
    resumeToken: z.string().min(1),
    skip: z.boolean().default(false),
    text: z.string().max(5000).optional(),
    link: z.string().max(2048).url().refine(isHttpUrl, "Enter a full link, like https://example.com").optional(),
    fileKey: z.string().optional(),
  })
  .refine((v) => v.skip || Boolean(v.text?.trim() || v.link || v.fileKey), {
    message: "Add an answer or skip the task",
  });
