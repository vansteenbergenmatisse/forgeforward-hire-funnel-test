import { config } from "dotenv";
import { defineConfig } from "vitest/config";
import path from "node:path";

// .env.local (vercel env pull) wins over .env
config({ path: [".env.local", ".env.development.local", ".env"], quiet: true });

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { include: ["src/**/*.test.ts", "tests/**/*.test.ts"], environment: "node" },
});
