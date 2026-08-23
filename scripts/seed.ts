import { loadEnvConfig } from "@next/env";
import { hash } from "bcryptjs";
import { eq, or } from "drizzle-orm";

loadEnvConfig(process.cwd());

async function upsertUser(params: {
  name: string;
  username: string;
  email: string;
  password: string;
  role: "admin" | "officer";
}) {
  const [{ db }, { users }] = await Promise.all([import("../db"), import("../db/schema")]);
  const existing = await db
    .select()
    .from(users)
    .where(or(eq(users.username, params.username), eq(users.email, params.email.toLowerCase())))
    .limit(1);

  if (existing[0]) {
    await db
      .update(users)
      .set({
        name: params.name,
        username: params.username,
        email: params.email.toLowerCase(),
        passwordHash: await hash(params.password, 12),
        role: params.role,
        updatedAt: new Date()
      })
      .where(eq(users.id, existing[0].id));

    return;
  }

  await db.insert(users).values({
    name: params.name,
    username: params.username,
    email: params.email.toLowerCase(),
    passwordHash: await hash(params.password, 12),
    role: params.role,
    updatedAt: new Date()
  });
}

async function main() {
  const [{ db }, { locations, violations }] = await Promise.all([import("../db"), import("../db/schema")]);
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Jackman";
  const byronPassword = process.env.SEED_BYRON_PASSWORD ?? "PATByron";
  const officerPassword = process.env.SEED_OFFICER_PASSWORD ?? "OfficerDemo1";

  await upsertUser({
    name: "Gabe",
    username: "WhyteOwl",
    email: "whyteowl@example.com",
    password: adminPassword,
    role: "admin"
  });

  await upsertUser({
    name: "Byron",
    username: "ByronPAT",
    email: "byron@example.com",
    password: byronPassword,
    role: "officer"
  });

  await upsertUser({
    name: "Officer Demo",
    username: "OfficerDemo",
    email: "officer@example.com",
    password: officerPassword,
    role: "officer"
  });

  const existingLocations = await db.select().from(locations);

  if (!existingLocations.length) {
    await db.insert(locations).values([
      { name: "North Garage", updatedAt: new Date() },
      { name: "Library Lot", updatedAt: new Date() },
      { name: "Student Center", updatedAt: new Date() }
    ]);
  }

  const existingViolations = await db.select().from(violations);

  if (!existingViolations.length) {
    await db.insert(violations).values([
      { code: "OVR", label: "Overtime Parking", defaultFine: "25.00", updatedAt: new Date() },
      { code: "NOP", label: "No Permit Displayed", defaultFine: "40.00", updatedAt: new Date() },
      { code: "FIR", label: "Fire Lane", defaultFine: "75.00", updatedAt: new Date() }
    ]);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
