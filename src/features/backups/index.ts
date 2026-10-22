// Client-safe public API of the backups feature. Server code is in ./server.
export {
  BACKUP_PREFIX,
  BACKUP_KEEP_DAYS,
  BACKUP_MAX_AGE_HOURS,
  backupKey,
  backupState,
  backupCheckText,
  deriveAlerts,
  selectBackupsToPrune,
  type SystemAlert,
  type BackupRow,
  type BackupState,
  type StoredBackup,
  type ErrorRow,
} from "./rules";
export { useSystemAlerts } from "./use-system-alerts";
