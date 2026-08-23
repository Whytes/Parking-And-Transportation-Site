import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "@/db/schema";
import { getDatabaseUrl } from "@/lib/env";

const databaseUrl = getDatabaseUrl();

const client = postgres(databaseUrl || "postgres://placeholder:placeholder@127.0.0.1:5432/placeholder", {
  prepare: false
});

export const db = drizzle(client, { schema });
