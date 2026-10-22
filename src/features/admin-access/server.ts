// Server-only entrypoint. `index` stays free of the database so the proxy can import it.
export { recordAudit, type AuditEntry } from "./audit";
