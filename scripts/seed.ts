import { config } from "dotenv";
import { closeDb } from "@/platform/db";
import { seedAppointmentSetter } from "@/features/projects/server";

// .env.local (vercel env pull) wins over .env
config({ path: [".env.local", ".env.development.local", ".env"], quiet: true });

seedAppointmentSetter()
  .then((r) => console.log(r.created ? `Seeded project ${r.projectId}` : "Project already exists"))
  .finally(closeDb);
