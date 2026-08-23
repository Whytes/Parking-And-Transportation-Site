"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { enforcementRecords, locations, locationViolations, users, violations } from "@/db/schema";
import { requirePermission } from "@/lib/authz";
import { getRecordById } from "@/lib/data";
import { inferRecordType, normalizeImportedDateTime, parseGoogleSheetCsv } from "@/lib/import";
import { type RecordFormState, type RecordFormValues, type WorkspaceRecord } from "@/lib/record-form";
import { archiveRecordSchema, itemIdSchema, locationSchema, normalizeRecordInput, recordSchema, violationSchema } from "@/lib/validation";
import { type ArchiveActionState, type LocationActionState, type LocationViolationActionState, type ViolationActionState } from "@/lib/workspace";

export type RestoreActionState = {
  error?: string;
  success?: string;
  restoredId?: string;
};

export type VoidActionState = {
  error?: string;
  success?: string;
  voidedId?: string;
};

export type ImportFormState = {
  error?: string;
  success?: string;
  rowErrors?: string[];
  details?: {
    importedCount: number;
    skippedDuplicates: number;
    createdLocations: number;
    createdViolations: number;
  };
};

function buildUniqueViolationCode(label: string, usedCodes: Set<string>) {
  const normalizedBase = label.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 9) || "IMPORT";
  let candidate = normalizedBase;
  let suffix = 1;

  while (usedCodes.has(candidate)) {
    const suffixText = String(suffix);
    candidate = `${normalizedBase.slice(0, Math.max(1, 12 - suffixText.length))}${suffixText}`;
    suffix += 1;
  }

  usedCodes.add(candidate);
  return candidate;
}

function readRecordValues(formData: FormData): RecordFormValues {
  return {
    id: String(formData.get("id") ?? "") || undefined,
    recordType: (String(formData.get("recordType") ?? "citation") as "citation" | "warning" | "chalk"),
    date: String(formData.get("date") ?? "").trim(),
    time: String(formData.get("time") ?? "").trim(),
    locationId: String(formData.get("locationId") ?? "").trim(),
    chalkTime: String(formData.get("chalkTime") ?? "").trim(),
    violationId: String(formData.get("violationId") ?? "").trim(),
    fineAmount: String(formData.get("fineAmount") ?? "").trim(),
    plateState: String(formData.get("plateState") ?? "").trim().toUpperCase(),
    plateNumber: String(formData.get("plateNumber") ?? "").trim().toUpperCase(),
    comment: String(formData.get("comment") ?? "").trim()
  };
}

function mapRecordErrors(values: RecordFormValues, issues: Array<{ path: PropertyKey[]; message: string }>): RecordFormState {
  const fieldErrors: Partial<Record<keyof RecordFormValues, string>> = {};

  for (const issue of issues) {
    const key = issue.path[0];

    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key as keyof RecordFormValues] = issue.message;
    }
  }

  return {
    error: "Please correct the highlighted fields.",
    fieldErrors,
    values
  };
}

function refreshRecordViews() {
  revalidatePath("/dashboard");
  revalidatePath("/citations");
  revalidatePath("/plates");
  revalidatePath("/add-citation");
}

function refreshOptionViews() {
  revalidatePath("/locations");
  revalidatePath("/violations");
  revalidatePath("/add-citation");
  revalidatePath("/citations");
}

export async function assignLocationViolationsAction(_: LocationViolationActionState, formData: FormData): Promise<LocationViolationActionState> {
  await requirePermission("locations");
  const locationId = String(formData.get("locationId") ?? "").trim();
  const violationIds = formData
    .getAll("violationIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!locationId) {
    return { error: "Location is required." };
  }

  try {
    await db.delete(locationViolations).where(eq(locationViolations.locationId, locationId));

    if (violationIds.length) {
      await db.insert(locationViolations).values(
        violationIds.map((violationId) => ({
          locationId,
          violationId
        }))
      );
    }

    refreshOptionViews();
    return { success: "Location violations updated.", locationId, violationIds };
  } catch {
    return { error: "Could not update location violations." };
  }
}

async function resolveImportedCreatedByUserId(officerNumber: string, fallbackUserId: string) {
  const normalizedOfficer = officerNumber.trim().toUpperCase();

  if (normalizedOfficer === "491" || normalizedOfficer === "491A") {
    const [byron] = await db.select({ id: users.id }).from(users).where(eq(users.username, "ByronPAT")).limit(1);

    if (byron) {
      return byron.id;
    }
  }

  return fallbackUserId;
}

function toWorkspaceRecord(record: NonNullable<Awaited<ReturnType<typeof getRecordById>>>): WorkspaceRecord {
  return {
    id: record.id,
    recordType: record.recordType,
    occurredAt: record.occurredAt.toISOString(),
    officerNumber: record.officerNumber,
    locationId: record.locationId,
    locationName: record.locationName,
    violationId: record.violationId,
    violationLabel: record.violationLabel,
    chalkTime: record.chalkTime,
    fineAmount: String(record.fineAmount),
    plateState: record.plateState,
    plateNumber: record.plateNumber,
    comment: record.comment,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    voidedAt: record.voidedAt ? record.voidedAt.toISOString() : null,
    voidReason: record.voidReason,
    createdByUserId: record.createdByUserId,
    createdByName: record.createdByName
  };
}

async function findDuplicateRecordId({
  id,
  occurredAt,
  locationId,
  violationId,
  plateState,
  plateNumber
}: {
  id?: string;
  occurredAt: Date;
  locationId: string;
  violationId: string;
  plateState: string;
  plateNumber: string;
}) {
  const candidates = await db
    .select({ id: enforcementRecords.id })
    .from(enforcementRecords)
    .where(
      and(
        isNull(enforcementRecords.archivedAt),
        isNull(enforcementRecords.voidedAt),
        eq(enforcementRecords.occurredAt, occurredAt),
        eq(enforcementRecords.locationId, locationId),
        eq(enforcementRecords.violationId, violationId),
        eq(enforcementRecords.plateState, plateState),
        eq(enforcementRecords.plateNumber, plateNumber)
      )
    )
    .limit(id ? 2 : 1);

  return candidates.find((candidate) => candidate.id !== id)?.id ?? null;
}

export async function createRecordAction(_: RecordFormState, formData: FormData): Promise<RecordFormState> {
  const session = await requirePermission("records:create");
  const values = readRecordValues(formData);
  const confirmDuplicate = String(formData.get("confirmDuplicate") ?? "") === "true";
  const parsed = recordSchema.safeParse(values);

  if (!parsed.success) {
    return mapRecordErrors(values, parsed.error.issues);
  }

  const normalized = normalizeRecordInput(parsed.data);

  const duplicateRecordId = await findDuplicateRecordId({
    occurredAt: normalized.occurredAt,
    locationId: normalized.locationId,
    violationId: normalized.violationId,
    plateState: normalized.plateState,
    plateNumber: normalized.plateNumber
  });

  if (duplicateRecordId && !confirmDuplicate) {
    return {
      duplicateWarning: "A matching record already exists for this plate, location, violation, and time.",
      duplicateRecordId,
      requiresDuplicateConfirmation: true,
      values
    };
  }

  try {
    const [created] = await db
      .insert(enforcementRecords)
      .values({
        recordType: normalized.recordType,
        occurredAt: normalized.occurredAt,
        officerNumber: session.user.name?.trim() || session.user.email?.trim() || session.user.id,
        locationId: normalized.locationId,
        violationId: normalized.violationId,
        chalkTime: normalized.chalkTime,
        fineAmount: normalized.fineAmount,
        plateState: normalized.plateState,
        plateNumber: normalized.plateNumber,
        comment: normalized.comment,
        createdByUserId: session.user.id,
        updatedAt: new Date()
      })
      .returning({ id: enforcementRecords.id });

    const saved = created ? await getRecordById(created.id) : null;

    if (!saved) {
      return {
        error: "Record was created but could not be reloaded.",
        values
      };
    }

    refreshRecordViews();

    return {
      success: "Record created successfully.",
      values,
      savedRecord: toWorkspaceRecord(saved)
    };
  } catch {
    return {
      error: "Database write failed. Review the form and try again.",
      values
    };
  }
}

export async function updateRecordAction(_: RecordFormState, formData: FormData): Promise<RecordFormState> {
  await requirePermission("records:edit");
  const values = readRecordValues(formData);
  const confirmDuplicate = String(formData.get("confirmDuplicate") ?? "") === "true";
  const parsed = recordSchema.safeParse(values);

  if (!parsed.success || !values.id) {
    return mapRecordErrors(values, parsed.success ? [{ path: ["id"], message: "Record id is required." }] : parsed.error.issues);
  }

  const normalized = normalizeRecordInput(parsed.data);

  const duplicateRecordId = await findDuplicateRecordId({
    id: values.id,
    occurredAt: normalized.occurredAt,
    locationId: normalized.locationId,
    violationId: normalized.violationId,
    plateState: normalized.plateState,
    plateNumber: normalized.plateNumber
  });

  if (duplicateRecordId && !confirmDuplicate) {
    return {
      duplicateWarning: "Another matching record already exists for this plate, location, violation, and time.",
      duplicateRecordId,
      requiresDuplicateConfirmation: true,
      values
    };
  }

  try {
    await db
      .update(enforcementRecords)
      .set({
        recordType: normalized.recordType,
        occurredAt: normalized.occurredAt,
        locationId: normalized.locationId,
        violationId: normalized.violationId,
        chalkTime: normalized.chalkTime,
        fineAmount: normalized.fineAmount,
        plateState: normalized.plateState,
        plateNumber: normalized.plateNumber,
        comment: normalized.comment,
        updatedAt: new Date()
      })
      .where(eq(enforcementRecords.id, values.id));

    const saved = await getRecordById(values.id);

    if (!saved) {
      return {
        error: "Record was updated but could not be reloaded.",
        values
      };
    }

    refreshRecordViews();

    return {
      success: "Record updated successfully.",
      values,
      savedRecord: toWorkspaceRecord(saved)
    };
  } catch {
    return {
      error: "Database update failed. Review the form and try again.",
      values
    };
  }
}

export async function archiveRecordAction(_: ArchiveActionState, formData: FormData): Promise<ArchiveActionState> {
  const session = await requirePermission("records:archive");
  const parsed = archiveRecordSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    archiveReason: String(formData.get("archiveReason") ?? "")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid delete request."
    };
  }

  try {
    await db
      .update(enforcementRecords)
      .set({
        archivedAt: new Date(),
        archivedByUserId: session.user.id,
        archiveReason: parsed.data.archiveReason,
        updatedAt: new Date()
      })
      .where(eq(enforcementRecords.id, parsed.data.id));
  } catch {
    return {
      error: "Delete failed. Try again."
    };
  }

  refreshRecordViews();
  return {
    success: "Record deleted successfully.",
    archivedId: parsed.data.id
  };
}

export async function restoreRecordAction(_: RestoreActionState, formData: FormData): Promise<RestoreActionState> {
  await requirePermission("records:archive");
  const parsed = itemIdSchema.safeParse({ id: String(formData.get("id") ?? "") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid restore request." };
  }

  try {
    await db
      .update(enforcementRecords)
      .set({ archivedAt: null, archivedByUserId: null, archiveReason: null, updatedAt: new Date() })
      .where(eq(enforcementRecords.id, parsed.data.id));
  } catch {
    return { error: "Restore failed. Try again." };
  }

  refreshRecordViews();
  return { success: "Record restored.", restoredId: parsed.data.id };
}

export async function voidRecordAction(_: VoidActionState, formData: FormData): Promise<VoidActionState> {
  const session = await requirePermission("records:edit");
  const parsed = itemIdSchema.safeParse({ id: String(formData.get("id") ?? "") });
  const voidReason = String(formData.get("voidReason") ?? "").trim();

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid void request." };
  }

  if (!voidReason) {
    return { error: "Void reason is required." };
  }

  try {
    await db
      .update(enforcementRecords)
      .set({
        voidedAt: new Date(),
        voidedByUserId: session.user.id,
        voidReason,
        updatedAt: new Date()
      })
      .where(eq(enforcementRecords.id, parsed.data.id));
  } catch {
    return { error: "Void failed. Try again." };
  }

  refreshRecordViews();
  return { success: "Ticket voided.", voidedId: parsed.data.id };
}

export async function createLocationAction(_: LocationActionState, formData: FormData): Promise<LocationActionState> {
  await requirePermission("locations");
  const parsed = locationSchema.safeParse({
    name: String(formData.get("name") ?? "")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid location."
    };
  }

  try {
    const [created] = await db
      .insert(locations)
      .values({
        name: parsed.data.name,
        updatedAt: new Date()
      })
        .returning({ id: locations.id, name: locations.name });

    refreshOptionViews();

    return {
      item: created,
      success: "Location saved."
    };
  } catch {
    return {
      error: "Location save failed. Try a different name."
    };
  }
}

export async function updateLocationAction(_: LocationActionState, formData: FormData): Promise<LocationActionState> {
  await requirePermission("locations");
  const id = String(formData.get("id") ?? "");
  const parsed = locationSchema.safeParse({ name: String(formData.get("name") ?? "") });

  if (!parsed.success || !id) {
    return { error: parsed.success ? "Invalid location." : parsed.error.issues[0]?.message ?? "Invalid location." };
  }

  try {
    const [updated] = await db
      .update(locations)
      .set({ name: parsed.data.name, updatedAt: new Date() })
      .where(eq(locations.id, id))
      .returning({ id: locations.id, name: locations.name });

    refreshOptionViews();
    return { item: updated, success: "Location updated." };
  } catch {
    return { error: "Location update failed. Try a different name." };
  }
}

export async function deleteLocationAction(_: LocationActionState, formData: FormData): Promise<LocationActionState> {
  await requirePermission("locations");
  const parsed = itemIdSchema.safeParse({ id: String(formData.get("id") ?? "") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid location delete request." };
  }

  try {
    const [usage] = await db
      .select({ count: count(enforcementRecords.id) })
      .from(enforcementRecords)
      .where(eq(enforcementRecords.locationId, parsed.data.id));

    if (usage.count > 0) {
      return { error: `Can't delete this location because ${usage.count} record${usage.count === 1 ? "" : "s"} use it.` };
    }

    await db.delete(locations).where(eq(locations.id, parsed.data.id));

    refreshOptionViews();
    return { deletedId: parsed.data.id, success: "Location deleted." };
  } catch {
    return { error: "Location delete failed." };
  }
}

export async function createViolationAction(_: ViolationActionState, formData: FormData): Promise<ViolationActionState> {
  await requirePermission("violations");
  const parsed = violationSchema.safeParse({
    label: String(formData.get("label") ?? ""),
    defaultFine: String(formData.get("defaultFine") ?? "0")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid violation."
    };
  }

  const defaultFine = Number(parsed.data.defaultFine.replace(/[$,\s]/g, "") || "0");

  try {
    const existingViolations = await db.select({ code: violations.code }).from(violations);
    const code = buildUniqueViolationCode(parsed.data.label, new Set(existingViolations.map((violation) => violation.code.trim().toUpperCase())));
    const [created] = await db
      .insert(violations)
      .values({
        code,
        label: parsed.data.label,
        defaultFine: defaultFine.toFixed(2),
        updatedAt: new Date()
      })
      .returning({
        id: violations.id,
        code: violations.code,
        label: violations.label,
        defaultFine: violations.defaultFine
      });

    refreshOptionViews();

    return {
      item: {
        ...created,
        defaultFine: String(created.defaultFine)
      },
      success: "Violation saved."
    };
  } catch {
    return {
      error: "Violation save failed. Try a different code."
    };
  }
}

export async function updateViolationAction(_: ViolationActionState, formData: FormData): Promise<ViolationActionState> {
  await requirePermission("violations");
  const id = String(formData.get("id") ?? "");
  const parsed = violationSchema.safeParse({
    label: String(formData.get("label") ?? ""),
    defaultFine: String(formData.get("defaultFine") ?? "0")
  });

  if (!parsed.success || !id) {
    return { error: parsed.success ? "Invalid violation." : parsed.error.issues[0]?.message ?? "Invalid violation." };
  }

  const defaultFine = Number(parsed.data.defaultFine.replace(/[$,\s]/g, "") || "0");

  try {
    const existingViolations = await db.select({ id: violations.id, code: violations.code }).from(violations);
    const usedCodes = new Set(
      existingViolations.filter((violation) => violation.id !== id).map((violation) => violation.code.trim().toUpperCase())
    );
    const code = buildUniqueViolationCode(parsed.data.label, usedCodes);
    const [updated] = await db
      .update(violations)
      .set({
        code,
        label: parsed.data.label,
        defaultFine: defaultFine.toFixed(2),
        updatedAt: new Date()
      })
      .where(eq(violations.id, id))
      .returning({ id: violations.id, code: violations.code, label: violations.label, defaultFine: violations.defaultFine });

    refreshOptionViews();
    return { item: { ...updated, defaultFine: String(updated.defaultFine) }, success: "Violation updated." };
  } catch {
    return { error: "Violation update failed. Try a different name." };
  }
}

export async function deleteViolationAction(_: ViolationActionState, formData: FormData): Promise<ViolationActionState> {
  await requirePermission("violations");
  const parsed = itemIdSchema.safeParse({ id: String(formData.get("id") ?? "") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid violation delete request." };
  }

  try {
    const [usage] = await db
      .select({ count: count(enforcementRecords.id) })
      .from(enforcementRecords)
      .where(eq(enforcementRecords.violationId, parsed.data.id));

    if (usage.count > 0) {
      return { error: `Can't delete this violation because ${usage.count} record${usage.count === 1 ? "" : "s"} use it.` };
    }

    await db.delete(violations).where(eq(violations.id, parsed.data.id));

    refreshOptionViews();
    return { deletedId: parsed.data.id, success: "Violation deleted." };
  } catch {
    return { error: "Violation delete failed." };
  }
}

export async function importRecordsAction(_: ImportFormState, formData: FormData): Promise<ImportFormState> {
  const session = await requirePermission("import");
  const confirmed = String(formData.get("confirmed") ?? "") === "yes";
  const file = formData.get("file");

  if (!confirmed) {
    return {
      error: "You must confirm before importing."
    };
  }

  if (!(file instanceof File) || !file.size) {
    return {
      error: "Upload a CSV file first."
    };
  }

  const csvText = await file.text();
  const parsed = parseGoogleSheetCsv(csvText);

  if (!parsed.rows.length) {
    return {
      error: "No importable rows were found in the CSV.",
      rowErrors: parsed.warnings
    };
  }

  try {
    const existingLocations = await db.select().from(locations);
    const existingViolations = await db.select().from(violations);
    const locationMap = new Map(existingLocations.map((location) => [location.name.trim().toLowerCase(), location]));
    const violationMap = new Map(existingViolations.map((violation) => [violation.label.trim().toLowerCase(), violation]));
    const usedViolationCodes = new Set(existingViolations.map((violation) => violation.code.trim().toUpperCase()));
    let createdLocations = 0;
    let createdViolations = 0;
    let importedCount = 0;
    let skippedDuplicates = 0;
    const rowWarnings = [...parsed.warnings];

    for (const row of parsed.rows) {
      const locationKey = row.locationName.trim().toLowerCase();

      if (!locationMap.has(locationKey)) {
        const [createdLocation] = await db
          .insert(locations)
          .values({
            name: row.locationName.trim(),
            updatedAt: new Date()
          })
          .returning();

        locationMap.set(locationKey, createdLocation);
        createdLocations += 1;
      }

      const recordType = inferRecordType(row);
      const violationLabel = row.violationLabel.trim() || (recordType === "chalk" ? "Chalked Vehicle" : "Imported Record");
      const violationKey = violationLabel.toLowerCase();

      if (!violationMap.has(violationKey)) {
        const code = buildUniqueViolationCode(violationLabel, usedViolationCodes);
        const [createdViolation] = await db
          .insert(violations)
          .values({
            code,
            label: violationLabel,
            defaultFine: recordType === "citation" ? row.fineAmount.replace(/[$,\s]/g, "") || "0.00" : "0.00",
            updatedAt: new Date()
          })
          .returning();

        violationMap.set(violationKey, createdViolation);
        createdViolations += 1;
      }
    }

    for (let index = 0; index < parsed.rows.length; index += 1) {
      const row = parsed.rows[index];
      const rowNumber = index + 2;
      const recordType = inferRecordType(row);
      const location = locationMap.get(row.locationName.trim().toLowerCase());
      const violationLabel = row.violationLabel.trim() || (recordType === "chalk" ? "Chalked Vehicle" : "Imported Record");
      const violation = violationMap.get(violationLabel.toLowerCase());

      if (!location || !violation) {
        rowWarnings.push(`Row ${rowNumber} was skipped because its location or violation could not be mapped.`);
        continue;
      }

      try {
        const occurredAt = normalizeImportedDateTime(row.date.trim(), row.time.trim());
        const officerNumber = row.officerNumber.trim() || session.user.name?.trim() || session.user.id;
        const createdByUserId = await resolveImportedCreatedByUserId(officerNumber, session.user.id);
        const fineAmount = recordType === "citation" ? (row.fineAmount || "0").replace(/[$,\s]/g, "") || "0.00" : "0.00";
        const plateState = row.plateState.trim().toUpperCase();
        const plateNumber = row.plateNumber.trim().toUpperCase();
        const comment = row.comment.trim();
        const chalkTime = row.chalkTime.trim() || null;

        const [existingRecord] = await db
          .select({ id: enforcementRecords.id })
          .from(enforcementRecords)
          .where(
            and(
              isNull(enforcementRecords.archivedAt),
              eq(enforcementRecords.recordType, recordType),
              eq(enforcementRecords.occurredAt, occurredAt),
              eq(enforcementRecords.officerNumber, officerNumber),
              eq(enforcementRecords.locationId, location.id),
              eq(enforcementRecords.violationId, violation.id),
              eq(enforcementRecords.plateState, plateState),
              eq(enforcementRecords.plateNumber, plateNumber),
              eq(enforcementRecords.comment, comment)
            )
          )
          .limit(1);

        if (existingRecord) {
          skippedDuplicates += 1;
          rowWarnings.push(`Row ${rowNumber} matched an existing record and was skipped.`);
          continue;
        }

        await db.insert(enforcementRecords).values({
          recordType,
          occurredAt,
          officerNumber,
          locationId: location.id,
          violationId: violation.id,
          chalkTime,
          fineAmount,
          plateState,
          plateNumber,
          comment,
          createdByUserId,
          updatedAt: new Date()
        });

        importedCount += 1;
      } catch (error) {
        rowWarnings.push(`Row ${rowNumber} was skipped: ${error instanceof Error ? error.message : "insert failed"}`);
      }
    }

    refreshRecordViews();
    revalidatePath("/import");

    return {
      success: importedCount ? "Import completed successfully." : "No new records were imported.",
      rowErrors: rowWarnings,
      details: {
        importedCount,
        skippedDuplicates,
        createdLocations,
        createdViolations
      }
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Import failed."
    };
  }
}
