// Client-safe public API of the retention feature. Server code is in ./server.
export {
  RETENTION_DAYS,
  WARNING_FROM_DAY,
  retentionCutoff,
  mediaKeys,
  ownFolders,
  isRetentionEligible,
  daysUntilDeletion,
  type RetentionSubject,
} from "./rules";
