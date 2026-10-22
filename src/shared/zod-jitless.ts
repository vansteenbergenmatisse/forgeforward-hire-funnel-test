import { z } from "zod";

// The site CSP has no 'unsafe-eval'. Zod 4 probes `new Function("")` when an object schema is CREATED, and the browser
// reports that probe as a CSP violation and a console error. Import this module before any module that builds a schema,
// so the probe is skipped. Parsing results are unchanged.
z.config({ jitless: true });
