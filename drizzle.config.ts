import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

import { getDatabaseUrl } from "@/lib/env";

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: getDatabaseUrl()
  }
});
