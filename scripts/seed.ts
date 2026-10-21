import "dotenv/config";
import { closeDb } from "@/platform/db";
import { seedAppointmentSetter } from "@/features/projects";

seedAppointmentSetter()
  .then((r) => console.log(r.created ? `Seeded project ${r.projectId}` : "Project already exists"))
  .finally(closeDb);
