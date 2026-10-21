import { z } from "zod";
import { parsePhone } from "@/shared/phone";

export const CONSENT_TEXT =
  "I agree that Forge Forward can contact me about this job by email, text and WhatsApp.";

export const startSchema = z
  .object({
    projectSlug: z.string().min(1),
    firstName: z.string().trim().min(1, "Enter your first name").max(60),
    lastName: z.string().trim().min(1, "Enter your last name").max(60),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
    phone: z.string().trim().min(1, "Check your phone number"),
    phoneCountry: z.string().length(2).optional(),
    whatsappOk: z.boolean(),
    timezone: z.string().min(1, "Pick your time zone"),
    consent: z.literal(true, { error: "Tick the box to continue" }),
    answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).default({}),
    utm: z.record(z.string(), z.string()).default({}),
    inAppBrowser: z.boolean().default(false),
    website: z.string().optional(), // honeypot
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
    link: z.string().url().optional(),
    fileKey: z.string().optional(),
  })
  .refine((v) => v.skip || Boolean(v.text?.trim() || v.link || v.fileKey), {
    message: "Add an answer or skip the task",
  });
