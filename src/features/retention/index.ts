// Client-safe public API of the retention feature. Server code is in ./server.
export {
  APPLICANT_RETENTION_DAYS,
  RETENTION_DAYS,
  WARNING_FROM_DAY,
  retentionCutoff,
  retentionClock,
  mediaKeys,
  ownFolders,
  isRetentionEligible,
  daysUntilDeletion,
  type RetentionSubject,
} from "./rules";
