import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "officer"]);
export const recordTypeEnum = pgEnum("record_type", ["citation", "warning", "chalk"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 150 }).notNull(),
    username: varchar("username", { length: 150 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash"),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    image: text("image"),
    role: roleEnum("role").notNull().default("officer"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    usernameIdx: uniqueIndex("users_username_idx").on(table.username),
    emailIdx: uniqueIndex("users_email_idx").on(table.email)
  })
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 })
  },
  (table) => ({
    compoundKey: primaryKey({ columns: [table.provider, table.providerAccountId] })
  })
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull()
  }
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull()
  },
  (table) => ({
    compoundKey: primaryKey({ columns: [table.identifier, table.token] })
  })
);

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    nameIdx: uniqueIndex("locations_name_idx").on(table.name)
  })
);

export const violations = pgTable(
  "violations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    label: varchar("label", { length: 200 }).notNull(),
    defaultFine: numeric("default_fine", { precision: 10, scale: 2 }).notNull().default("0"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    codeIdx: uniqueIndex("violations_code_idx").on(table.code)
  })
);

export const enforcementRecords = pgTable("enforcement_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  recordType: recordTypeEnum("record_type").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  officerNumber: varchar("officer_number", { length: 50 }).notNull(),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  violationId: uuid("violation_id").notNull().references(() => violations.id),
  chalkTime: varchar("chalk_time", { length: 5 }),
  fineAmount: numeric("fine_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  plateState: varchar("plate_state", { length: 10 }).notNull(),
  plateNumber: varchar("plate_number", { length: 20 }).notNull(),
  comment: text("comment").notNull().default(""),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  voidedAt: timestamp("voided_at", { withTimezone: true }),
  voidedByUserId: uuid("voided_by_user_id").references(() => users.id),
  voidReason: text("void_reason"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedByUserId: uuid("archived_by_user_id").references(() => users.id),
  archiveReason: text("archive_reason")
});

export const vehicleNotes = pgTable(
  "vehicle_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    plateState: varchar("plate_state", { length: 10 }).notNull(),
    plateNumber: varchar("plate_number", { length: 20 }).notNull(),
    note: text("note").notNull(),
    updatedByUserId: uuid("updated_by_user_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    plateIdx: uniqueIndex("vehicle_notes_plate_idx").on(table.plateState, table.plateNumber)
  })
);
