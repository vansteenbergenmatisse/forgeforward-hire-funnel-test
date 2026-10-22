import { unknownVariables } from "@/features/messaging";
import { badRequest } from "./errors";

/** Rejects a template whose subject or body has a {variable} the messaging feature does not know. Answers 400 and names each one. */
export function assertKnownVariables(subject: string, body: string): void {
  const bad = unknownVariables(`${subject} ${body}`);
  if (bad.length === 0) return;
  throw badRequest("unknown_variables", `Unknown variable ${bad.map((b) => `{${b}}`).join(", ")}. Use only the known variables.`);
}
