// Server-only entrypoint. `index` stays free of the database so the proxy can import it.
export { recordAudit, type AuditEntry } from "./audit";
export { attemptLogin, loginBucket, LOGIN_MAX_FAILURES, LOGIN_WINDOW_MS, type LoginResult } from "./login";
export { verifyPassword } from "./password";
