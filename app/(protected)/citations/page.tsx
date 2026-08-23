import { CitationsWorkspace } from "@/components/citations-workspace";
import { getAllLocations, getAllViolations, getLocationViolationAssignments, getLocations, getVehicleNotes, getViolations, listArchivedRecords, listRecords } from "@/lib/data";

export default async function CitationsPage({
  searchParams
}: {
  searchParams: Promise<{ created?: string; archived?: string; record?: string; mode?: string }>;
}) {
  const [records, archivedRecords, locations, violations, allLocations, allViolations, vehicleNotes, locationViolationAssignments] = await Promise.all([
    listRecords(),
    listArchivedRecords(),
    getLocations(),
    getViolations(),
    getAllLocations(),
    getAllViolations(),
    getVehicleNotes(),
    getLocationViolationAssignments()
  ]);
  const params = await searchParams;
  const sortedLocations = [...locations].sort((left, right) => {
    const countDiff = Number(right.recordCount) - Number(left.recordCount);

    if (countDiff !== 0) {
      return countDiff;
    }

    return left.name.localeCompare(right.name);
  });

  return (
    <CitationsWorkspace
      initialRecords={records.map((record) => ({
        ...record,
        occurredAt: record.occurredAt.toISOString(),
        chalkTime: record.chalkTime,
        fineAmount: String(record.fineAmount),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        voidedAt: record.voidedAt ? record.voidedAt.toISOString() : null,
        voidReason: record.voidReason
      }))}
      initialArchivedRecords={archivedRecords.map((record) => ({
        ...record,
        occurredAt: record.occurredAt.toISOString(),
        chalkTime: record.chalkTime,
        fineAmount: String(record.fineAmount),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        voidedAt: record.voidedAt ? record.voidedAt.toISOString() : null,
        voidReason: record.voidReason
      }))}
      initialLocations={sortedLocations.map((location) => ({ id: location.id, name: location.name }))}
      initialViolations={violations.map((violation) => ({
        id: violation.id,
        code: violation.code,
        label: violation.label,
        defaultFine: String(violation.defaultFine)
      }))}
      initialAllLocations={allLocations.map((location) => ({ id: location.id, name: location.name }))}
      initialAllViolations={allViolations.map((violation) => ({
        id: violation.id,
        code: violation.code,
        label: violation.label,
        defaultFine: String(violation.defaultFine)
      }))}
      initialVehicleNotes={vehicleNotes.map((note) => ({
        plateState: note.plateState,
        plateNumber: note.plateNumber,
        note: note.note,
        updatedAt: note.updatedAt.toISOString(),
        updatedByName: note.updatedByName
      }))}
      initialLocationViolationAssignments={locationViolationAssignments}
      initialSelectedRecordId={params.record}
      initialModalMode={params.mode === "edit" ? "edit" : params.record ? "view" : undefined}
      created={params.created === "1"}
      archived={params.archived === "1"}
    />
  );
}
