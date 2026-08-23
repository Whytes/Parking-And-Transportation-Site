import { and, asc, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { enforcementRecords, locations, locationViolations, users, vehicleNotes, violations } from "@/db/schema";

export async function getDashboardStats() {
  const [aggregate] = await db
    .select({
      total: count(enforcementRecords.id),
      citations: sql<number>`count(*) filter (where ${enforcementRecords.recordType} = 'citation')`,
      warnings: sql<number>`count(*) filter (where ${enforcementRecords.recordType} = 'warning')`
    })
    .from(enforcementRecords)
    .where(and(isNull(enforcementRecords.archivedAt), isNull(enforcementRecords.voidedAt)));

  const recentRecords = await db
    .select({
      id: enforcementRecords.id,
      recordType: enforcementRecords.recordType,
      plateState: enforcementRecords.plateState,
      plateNumber: enforcementRecords.plateNumber,
      occurredAt: enforcementRecords.occurredAt,
      officerNumber: enforcementRecords.officerNumber,
      locationName: locations.name,
      violationLabel: violations.label,
      fineAmount: enforcementRecords.fineAmount
    })
    .from(enforcementRecords)
    .innerJoin(locations, eq(enforcementRecords.locationId, locations.id))
    .innerJoin(violations, eq(enforcementRecords.violationId, violations.id))
    .where(and(isNull(enforcementRecords.archivedAt), isNull(enforcementRecords.voidedAt)))
    .orderBy(desc(enforcementRecords.occurredAt))
    .limit(10);

  return {
    aggregate,
    recentRecords
  };
}

export async function listRecords() {
  return db
    .select({
      id: enforcementRecords.id,
      recordType: enforcementRecords.recordType,
      occurredAt: enforcementRecords.occurredAt,
      officerNumber: enforcementRecords.officerNumber,
      locationId: enforcementRecords.locationId,
      locationName: locations.name,
      violationId: enforcementRecords.violationId,
      violationLabel: violations.label,
      chalkTime: enforcementRecords.chalkTime,
      fineAmount: enforcementRecords.fineAmount,
      plateState: enforcementRecords.plateState,
      plateNumber: enforcementRecords.plateNumber,
      comment: enforcementRecords.comment,
      createdAt: enforcementRecords.createdAt,
      updatedAt: enforcementRecords.updatedAt,
      voidedAt: enforcementRecords.voidedAt,
      voidReason: enforcementRecords.voidReason,
      createdByUserId: enforcementRecords.createdByUserId,
      createdByName: users.name
    })
    .from(enforcementRecords)
    .innerJoin(locations, eq(enforcementRecords.locationId, locations.id))
    .innerJoin(violations, eq(enforcementRecords.violationId, violations.id))
    .innerJoin(users, eq(enforcementRecords.createdByUserId, users.id))
    .where(isNull(enforcementRecords.archivedAt))
    .orderBy(desc(enforcementRecords.occurredAt));
}

export async function listArchivedRecords() {
  return db
    .select({
      id: enforcementRecords.id,
      recordType: enforcementRecords.recordType,
      occurredAt: enforcementRecords.occurredAt,
      officerNumber: enforcementRecords.officerNumber,
      locationId: enforcementRecords.locationId,
      locationName: locations.name,
      violationId: enforcementRecords.violationId,
      violationLabel: violations.label,
      chalkTime: enforcementRecords.chalkTime,
      fineAmount: enforcementRecords.fineAmount,
      plateState: enforcementRecords.plateState,
      plateNumber: enforcementRecords.plateNumber,
      comment: enforcementRecords.comment,
      createdAt: enforcementRecords.createdAt,
      updatedAt: enforcementRecords.updatedAt,
      voidedAt: enforcementRecords.voidedAt,
      voidReason: enforcementRecords.voidReason,
      createdByUserId: enforcementRecords.createdByUserId,
      createdByName: users.name
    })
    .from(enforcementRecords)
    .innerJoin(locations, eq(enforcementRecords.locationId, locations.id))
    .innerJoin(violations, eq(enforcementRecords.violationId, violations.id))
    .innerJoin(users, eq(enforcementRecords.createdByUserId, users.id))
    .where(sql`${enforcementRecords.archivedAt} is not null`)
    .orderBy(desc(enforcementRecords.updatedAt));
}

export async function getRecordById(id: string) {
  const [record] = await db
    .select({
      id: enforcementRecords.id,
      recordType: enforcementRecords.recordType,
      occurredAt: enforcementRecords.occurredAt,
      officerNumber: enforcementRecords.officerNumber,
      locationId: enforcementRecords.locationId,
      locationName: locations.name,
      violationId: enforcementRecords.violationId,
      violationLabel: violations.label,
      chalkTime: enforcementRecords.chalkTime,
      fineAmount: enforcementRecords.fineAmount,
      plateState: enforcementRecords.plateState,
      plateNumber: enforcementRecords.plateNumber,
      comment: enforcementRecords.comment,
      createdAt: enforcementRecords.createdAt,
      updatedAt: enforcementRecords.updatedAt,
      voidedAt: enforcementRecords.voidedAt,
      voidReason: enforcementRecords.voidReason,
      createdByUserId: enforcementRecords.createdByUserId,
      archivedAt: enforcementRecords.archivedAt,
      createdByName: users.name
    })
    .from(enforcementRecords)
    .innerJoin(locations, eq(enforcementRecords.locationId, locations.id))
    .innerJoin(violations, eq(enforcementRecords.violationId, violations.id))
    .innerJoin(users, eq(enforcementRecords.createdByUserId, users.id))
    .where(eq(enforcementRecords.id, id))
    .limit(1);

  return record ?? null;
}

export async function searchPlateHistory(plateState?: string, plateNumber?: string) {
  if (!plateState || !plateNumber) {
    return [];
  }

  return db
    .select({
      id: enforcementRecords.id,
      recordType: enforcementRecords.recordType,
      occurredAt: enforcementRecords.occurredAt,
      officerNumber: enforcementRecords.officerNumber,
      locationName: locations.name,
      violationLabel: violations.label,
      fineAmount: enforcementRecords.fineAmount,
      comment: enforcementRecords.comment
    })
    .from(enforcementRecords)
    .innerJoin(locations, eq(enforcementRecords.locationId, locations.id))
    .innerJoin(violations, eq(enforcementRecords.violationId, violations.id))
    .where(
      and(
        isNull(enforcementRecords.archivedAt),
        eq(enforcementRecords.plateState, plateState.toUpperCase().trim()),
        eq(enforcementRecords.plateNumber, plateNumber.toUpperCase().trim())
      )
    )
    .orderBy(desc(enforcementRecords.occurredAt));
}

export async function getLocations() {
  return db
    .select({
      id: locations.id,
      name: locations.name,
      isActive: locations.isActive,
      createdAt: locations.createdAt,
      updatedAt: locations.updatedAt,
      recordCount: count(enforcementRecords.id)
    })
    .from(locations)
    .leftJoin(
      enforcementRecords,
      and(eq(enforcementRecords.locationId, locations.id), isNull(enforcementRecords.archivedAt))
    )
    .groupBy(locations.id)
    .orderBy(desc(count(enforcementRecords.id)), asc(locations.name));
}

export async function getViolations() {
  return db.select().from(violations).orderBy(asc(violations.label));
}

export async function getAllLocations() {
  return db.select().from(locations).orderBy(asc(locations.name));
}

export async function getAllViolations() {
  return db.select().from(violations).orderBy(asc(violations.label));
}

export async function getLocationViolationAssignments() {
  return db
    .select({
      locationId: locationViolations.locationId,
      violationId: locationViolations.violationId
    })
    .from(locationViolations);
}

export async function getOfficers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt
    })
    .from(users)
    .orderBy(asc(users.name));
}

export async function getVehicleNotes() {
  return db
    .select({
      plateState: vehicleNotes.plateState,
      plateNumber: vehicleNotes.plateNumber,
      note: vehicleNotes.note,
      updatedAt: vehicleNotes.updatedAt,
      updatedByName: users.name
    })
    .from(vehicleNotes)
    .innerJoin(users, eq(vehicleNotes.updatedByUserId, users.id));
}

export async function searchRecords(term: string) {
  const query = `%${term.trim()}%`;

  return db
    .select({
      id: enforcementRecords.id,
      recordType: enforcementRecords.recordType,
      plateState: enforcementRecords.plateState,
      plateNumber: enforcementRecords.plateNumber,
      violationLabel: violations.label,
      locationName: locations.name,
      occurredAt: enforcementRecords.occurredAt
    })
    .from(enforcementRecords)
    .innerJoin(locations, eq(enforcementRecords.locationId, locations.id))
    .innerJoin(violations, eq(enforcementRecords.violationId, violations.id))
    .where(
      and(
        isNull(enforcementRecords.archivedAt),
        or(
          ilike(enforcementRecords.plateNumber, query),
          ilike(enforcementRecords.plateState, query),
          ilike(locations.name, query),
          ilike(violations.label, query)
        )
      )
    )
    .orderBy(desc(enforcementRecords.occurredAt))
    .limit(25);
}
