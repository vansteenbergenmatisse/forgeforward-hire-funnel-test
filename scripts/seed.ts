import "dotenv/config";
import { closeDb } from "@/platform/db";
import { seedAppointmentSetter } from "@/features/projects/server";

seedAppointmentSetter()
  .then((r) => console.log(r.created ? `Seeded project ${r.projectId}` : "Project already exists"))
  .finally(closeDb);
