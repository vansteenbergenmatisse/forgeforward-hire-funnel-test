import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// .env.local (vercel env pull) wins over .env
config({ path: [".env.local", ".env.development.local", ".env"], quiet: true });

export default defineConfig({
  schema: "./src/platform/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "" },
});
