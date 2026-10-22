import type { ApplicantsLoadError } from "@/features/applicants";

/** Plain-language reason a list could not be loaded. */
export function loadErrorText(error: ApplicantsLoadError): string {
  return error === "session"
    ? "Your session ended. Open your admin link again to sign in."
    : "Could not reach the server. Check your connection.";
}
