"use client";

import { useActionState, useDeferredValue, useEffect, useMemo, useState } from "react";

import { Modal } from "@/components/modal";
import { RecordForm } from "@/components/record-form";
import { StatusBadge } from "@/components/status-badge";
import {
  assignLocationViolationsAction,
  archiveRecordAction,
  createLocationAction,
  createViolationAction,
  deleteLocationAction,
  deleteViolationAction,
  restoreRecordAction,
  updateLocationAction,
  updateViolationAction,
  voidRecordAction
} from "@/lib/actions/records";
import { saveVehicleNoteAction } from "@/lib/actions/admin";
import { type DuplicateCandidate, type WorkspaceRecord } from "@/lib/record-form";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { type ArchiveActionState, type LocationActionState, type LocationViolationActionState, type ViolationActionState } from "@/lib/workspace";

type LocationOption = {
  id: string;
  name: string;
};

type ViolationOption = {
  id: string;
  code: string;
  label: string;
  defaultFine: string;
};

type PlateSuggestion = {
  plateState: string;
  plateNumber: string;
};

type VehicleNoteEntry = {
  plateState: string;
  plateNumber: string;
  note: string;
  updatedAt: string;
  updatedByName: string;
};

type LocationViolationAssignment = {
  locationId: string;
  violationId: string;
};

type HistoryFilters = {
  startDate: string;
  endDate: string;
  locationName: string;
  violationLabel: string;
  createdByName: string;
  recordType: "all" | WorkspaceRecord["recordType"];
};

const initialLocationState: LocationActionState = {};
const initialViolationState: ViolationActionState = {};
const initialArchiveState: ArchiveActionState = {};
const RECORDS_PER_PAGE = 25;
const ARCHIVED_RECORDS_PER_PAGE = 10;

function PaginationControls({
  historyPage,
  totalHistoryPages,
  onPrevious,
  onNext
}: {
  historyPage: number;
  totalHistoryPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="history-pagination">
      <span className="muted">
        Page {historyPage} of {totalHistoryPages}
      </span>
      <div className="history-pagination-actions">
        <button className="button-secondary button-inline" type="button" onClick={onPrevious} disabled={historyPage === 1}>
          Previous
        </button>
        <button className="button-secondary button-inline" type="button" onClick={onNext} disabled={historyPage === totalHistoryPages}>
          Next
        </button>
      </div>
    </div>
  );
}

export function CitationsWorkspace({
  initialRecords,
  initialArchivedRecords,
  initialLocations,
  initialViolations,
  initialAllLocations,
  initialAllViolations,
  initialVehicleNotes,
  initialLocationViolationAssignments,
  initialSelectedRecordId,
  initialModalMode,
  created,
  archived
}: {
  initialRecords: WorkspaceRecord[];
  initialArchivedRecords: WorkspaceRecord[];
  initialLocations: LocationOption[];
  initialViolations: ViolationOption[];
  initialAllLocations: LocationOption[];
  initialAllViolations: ViolationOption[];
  initialVehicleNotes: VehicleNoteEntry[];
  initialLocationViolationAssignments: LocationViolationAssignment[];
  initialSelectedRecordId?: string;
  initialModalMode?: "view" | "edit";
  created?: boolean;
  archived?: boolean;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [archivedRecords, setArchivedRecords] = useState(initialArchivedRecords);
  const [locations, setLocations] = useState(initialLocations);
  const [allLocations, setAllLocations] = useState(initialAllLocations);
  const [allViolations, setAllViolations] = useState(initialAllViolations);
  const [vehicleNotes, setVehicleNotes] = useState(initialVehicleNotes);
  const [locationViolationAssignments, setLocationViolationAssignments] = useState(initialLocationViolationAssignments);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [filters, setFilters] = useState<HistoryFilters>({
    startDate: "",
    endDate: "",
    locationName: "all",
    violationLabel: "all",
    createdByName: "all",
    recordType: "all"
  });
  const [historyPage, setHistoryPage] = useState(1);
  const [archivedHistoryPage, setArchivedHistoryPage] = useState(1);
  const [showArchivedRecords, setShowArchivedRecords] = useState(false);
  const [createFormVersion, setCreateFormVersion] = useState(0);
  const [createRecordType, setCreateRecordType] = useState<WorkspaceRecord["recordType"]>("citation");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(initialSelectedRecordId ?? null);
  const [selectedPlate, setSelectedPlate] = useState<{ plateState?: string; plateNumber: string } | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "vehicle" | "location" | "violation" | null>(initialModalMode ?? null);
  const [resumeMode, setResumeMode] = useState<"view" | "edit" | "vehicle" | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [assigningLocationId, setAssigningLocationId] = useState<string | null>(null);
  const [editingViolationId, setEditingViolationId] = useState<string | null>(null);

  const [locationState, locationAction, locationPending] = useActionState(createLocationAction, initialLocationState);
  const [locationUpdateState, locationUpdateAction, locationUpdatePending] = useActionState(updateLocationAction, initialLocationState);
  const [locationDeleteState, locationDeleteAction, locationDeletePending] = useActionState(deleteLocationAction, initialLocationState);
  const [locationAssignmentState, locationAssignmentAction, locationAssignmentPending] = useActionState(assignLocationViolationsAction, {} as LocationViolationActionState);
  const [violationState, violationAction, violationPending] = useActionState(createViolationAction, initialViolationState);
  const [violationUpdateState, violationUpdateAction, violationUpdatePending] = useActionState(updateViolationAction, initialViolationState);
  const [violationDeleteState, violationDeleteAction, violationDeletePending] = useActionState(deleteViolationAction, initialViolationState);
  const [archiveState, archiveAction, archivePending] = useActionState(archiveRecordAction, initialArchiveState);
  const [restoreState, restoreAction, restorePending] = useActionState(restoreRecordAction, {});
  const [voidState, voidAction, voidPending] = useActionState(voidRecordAction, {});
  const [vehicleNoteState, vehicleNoteAction, vehicleNotePending] = useActionState(saveVehicleNoteAction, {});
  const violations = allViolations;

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) ?? null,
    [records, selectedRecordId]
  );

  const filteredRecords = useMemo(() => {
    const query = deferredSearchTerm.trim().toLowerCase();

    return records.filter((record) => {
      if (filters.recordType !== "all" && record.recordType !== filters.recordType) {
        return false;
      }

      if (filters.locationName !== "all" && record.locationName !== filters.locationName) {
        return false;
      }

      if (filters.violationLabel !== "all" && record.violationLabel !== filters.violationLabel) {
        return false;
      }

      if (filters.createdByName !== "all" && record.createdByName !== filters.createdByName) {
        return false;
      }

      const occurredAt = new Date(record.occurredAt);

      if (filters.startDate && occurredAt < new Date(`${filters.startDate}T00:00:00`)) {
        return false;
      }

      if (filters.endDate && occurredAt > new Date(`${filters.endDate}T23:59:59.999`)) {
        return false;
      }

      const haystack = [
        record.plateState,
        record.plateNumber,
        record.locationName,
        record.violationLabel,
        record.officerNumber,
        record.createdByName
      ]
        .join(" ")
        .toLowerCase();

      return !query || haystack.includes(query);
    });
  }, [deferredSearchTerm, filters, records]);

  const uniqueLocations = useMemo(() => Array.from(new Set(records.map((record) => record.locationName))).sort(), [records]);
  const uniqueViolations = useMemo(() => Array.from(new Set(records.map((record) => record.violationLabel))).sort(), [records]);
  const uniqueCreators = useMemo(() => Array.from(new Set(records.map((record) => record.createdByName))).sort(), [records]);
  const archivedId = archiveState.archivedId ?? null;
  const archiveReason = archiveState.archiveReason ?? null;

  function getDuplicateCandidate(input: {
    id?: string;
    plateState: string;
    plateNumber: string;
    locationId: string;
    violationId: string;
    date: string;
    time: string;
  }) {
    if (!input.plateNumber || !input.locationId || !input.violationId || !input.date || !input.time) {
      return null;
    }

    const occurredAt = new Date(`${input.date}T${input.time}:00`).toISOString();

    const match = records.find(
      (record) =>
        record.id !== input.id &&
        record.plateNumber === input.plateNumber.trim().toUpperCase() &&
        record.plateState === input.plateState.trim().toUpperCase() &&
        record.locationId === input.locationId &&
        record.violationId === input.violationId &&
        new Date(record.occurredAt).toISOString() === occurredAt
    );

    return match
      ? {
          id: match.id,
          occurredAt: match.occurredAt,
          locationName: match.locationName,
          violationLabel: match.violationLabel
        }
      : null;
  }

  const totalHistoryPages = Math.max(1, Math.ceil(filteredRecords.length / RECORDS_PER_PAGE));
  const pagedRecords = useMemo(() => {
    const start = (historyPage - 1) * RECORDS_PER_PAGE;
    return filteredRecords.slice(start, start + RECORDS_PER_PAGE);
  }, [filteredRecords, historyPage]);
  const totalArchivedPages = Math.max(1, Math.ceil(archivedRecords.length / ARCHIVED_RECORDS_PER_PAGE));
  const pagedArchivedRecords = useMemo(() => {
    const start = (archivedHistoryPage - 1) * ARCHIVED_RECORDS_PER_PAGE;
    return archivedRecords.slice(start, start + ARCHIVED_RECORDS_PER_PAGE);
  }, [archivedHistoryPage, archivedRecords]);

  const vehicleRecords = useMemo(() => {
    if (!selectedPlate) {
      return [];
    }

    return records
      .filter(
        (record) =>
          record.plateNumber.toUpperCase() === selectedPlate.plateNumber.toUpperCase() &&
          (!selectedPlate.plateState || record.plateState.toUpperCase() === selectedPlate.plateState.toUpperCase())
      )
      .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
  }, [records, selectedPlate]);

  const vehicleSummary = useMemo(() => {
    if (!vehicleRecords.length) {
      return null;
    }

    const lastCitation = vehicleRecords.find((record) => record.recordType === "citation") ?? null;
    const lastWarning = vehicleRecords.find((record) => record.recordType === "warning") ?? null;
    const notes = vehicleRecords
      .map((record) => record.comment.trim())
      .filter(Boolean)
      .filter((note, index, list) => list.indexOf(note) === index)
      .slice(0, 5);

    return {
      repeatCount: vehicleRecords.length,
      lastCitation,
      lastWarning,
      notes
    };
  }, [vehicleRecords]);

  const selectedVehicleNote = useMemo(() => {
    if (!selectedPlate) {
      return null;
    }

    return (
      vehicleNotes.find(
        (note) => note.plateNumber === selectedPlate.plateNumber && (!selectedPlate.plateState || note.plateState === selectedPlate.plateState)
      ) ?? null
    );
  }, [selectedPlate, vehicleNotes]);

  useEffect(() => {
    const createdLocation = locationState.item;

    if (createdLocation) {
      setLocations((current) => {
        if (current.some((location) => location.id === createdLocation.id)) {
          return current;
        }

        return [...current, createdLocation];
      });
      setAllLocations((current) => {
        if (current.some((location) => location.id === createdLocation.id)) {
          return current;
        }

        return [...current, createdLocation].sort((left, right) => left.name.localeCompare(right.name));
      });
      setEditingLocationId(null);
    }
  }, [locationState.item]);

  useEffect(() => {
    const updatedLocation = locationUpdateState.item;

    if (updatedLocation) {
      setLocations((current) => current.map((location) => (location.id === updatedLocation.id ? updatedLocation : location)));
      setAllLocations((current) =>
        current
          .map((location) => (location.id === updatedLocation.id ? updatedLocation : location))
          .sort((left, right) => left.name.localeCompare(right.name))
      );
      setEditingLocationId(null);
    }
  }, [locationUpdateState.item]);

  useEffect(() => {
    if (locationDeleteState.deletedId) {
      setLocations((current) => current.filter((location) => location.id !== locationDeleteState.deletedId));
      setAllLocations((current) => current.filter((location) => location.id !== locationDeleteState.deletedId));
      setLocationViolationAssignments((current) => current.filter((item) => item.locationId !== locationDeleteState.deletedId));
      setEditingLocationId(null);
    }
  }, [locationDeleteState.deletedId]);

  useEffect(() => {
    if (locationAssignmentState.locationId) {
      setLocationViolationAssignments((current) => {
        const remaining = current.filter((item) => item.locationId !== locationAssignmentState.locationId);
        const next = (locationAssignmentState.violationIds ?? []).map((violationId) => ({
          locationId: locationAssignmentState.locationId!,
          violationId
        }));

        return [...remaining, ...next];
      });
    }
  }, [locationAssignmentState.locationId, locationAssignmentState.violationIds]);

  useEffect(() => {
    const createdViolation = violationState.item;

    if (createdViolation) {
      setAllViolations((current) => {
        if (current.some((violation) => violation.id === createdViolation.id)) {
          return current;
        }

        return [...current, createdViolation].sort((left, right) => left.label.localeCompare(right.label));
      });
      setEditingViolationId(null);
    }
  }, [violationState.item]);

  useEffect(() => {
    const updatedViolation = violationUpdateState.item;

    if (updatedViolation) {
      setAllViolations((current) =>
        current
          .map((violation) => (violation.id === updatedViolation.id ? updatedViolation : violation))
          .sort((left, right) => left.label.localeCompare(right.label))
      );
      setEditingViolationId(null);
    }
  }, [violationUpdateState.item]);

  useEffect(() => {
    if (violationDeleteState.deletedId) {
      setAllViolations((current) => current.filter((violation) => violation.id !== violationDeleteState.deletedId));
      setEditingViolationId(null);
    }
  }, [violationDeleteState.deletedId]);

  useEffect(() => {
    if (archivedId) {
      setRecords((current) => {
        const archived = current.find((record) => record.id === archivedId);

        if (archived) {
          const archivedWithReason = {
            ...archived,
            archiveReason: archiveReason ?? archived.archiveReason ?? null
          };
          setArchivedRecords((existing) =>
            existing.some((record) => record.id === archived.id) ? existing : [archivedWithReason, ...existing]
          );
        }

        return current.filter((record) => record.id !== archivedId);
      });
      setSelectedRecordId(null);
      setModalMode(null);
      setShowDeleteConfirm(false);
    }
  }, [archiveReason, archivedId]);

  useEffect(() => {
    if (voidState.voidedId) {
      setRecords((current) =>
        current.map((record) =>
          record.id === voidState.voidedId
            ? { ...record, voidedAt: new Date().toISOString(), voidReason: null }
            : record
        )
      );
      setShowVoidConfirm(false);
      setShowDeleteConfirm(false);
    }
  }, [voidState.voidedId]);

  useEffect(() => {
    if (restoreState.restoredId) {
      setArchivedRecords((current) => {
        const restored = current.find((record) => record.id === restoreState.restoredId);

        if (restored) {
          setRecords((existing) => (existing.some((record) => record.id === restored.id) ? existing : [restored, ...existing]));
        }

        return current.filter((record) => record.id !== restoreState.restoredId);
      });
    }
  }, [restoreState.restoredId]);

  useEffect(() => {
    const updatedNote = vehicleNoteState.note;

    if (updatedNote === undefined) {
      return;
    }

    if (updatedNote === null) {
      setVehicleNotes((current) =>
        current.filter(
          (note) => !(selectedPlate && note.plateNumber === selectedPlate.plateNumber && (!selectedPlate.plateState || note.plateState === selectedPlate.plateState))
        )
      );
      return;
    }

    setVehicleNotes((current) => {
      const next = current.filter(
        (note) => !(note.plateState === updatedNote.plateState && note.plateNumber === updatedNote.plateNumber)
      );

      return [updatedNote, ...next];
    });
  }, [selectedPlate, vehicleNoteState.note]);

  useEffect(() => {
    setHistoryPage(1);
  }, [filters, searchTerm]);

  useEffect(() => {
    if (archivedHistoryPage > totalArchivedPages) {
      setArchivedHistoryPage(totalArchivedPages);
    }
  }, [archivedHistoryPage, totalArchivedPages]);

  useEffect(() => {
    if (historyPage > totalHistoryPages) {
      setHistoryPage(totalHistoryPages);
    }
  }, [historyPage, totalHistoryPages]);

  function handleCreatedRecord(record: WorkspaceRecord) {
    setRecords((current) => [record, ...current.filter((entry) => entry.id !== record.id)]);
    setCreateFormVersion((current) => current + 1);
  }

  function handleUpdatedRecord(record: WorkspaceRecord) {
    setRecords((current) => current.map((entry) => (entry.id === record.id ? record : entry)));
    setSelectedRecordId(record.id);
    setModalMode("view");
    setShowDeleteConfirm(false);
  }

  function openRecord(recordId: string) {
    setSelectedRecordId(recordId);
    setModalMode("view");
    setResumeMode(null);
    setShowDeleteConfirm(false);
  }

  function openDuplicateRecord(recordId: string) {
    openRecord(recordId);
  }

  function openVehicleProfile(plateState: string, plateNumber: string) {
    const normalizedState = plateState.trim().toUpperCase();
    const normalizedPlate = plateNumber.trim().toUpperCase();

    if (!normalizedPlate) {
      return;
    }

    const hasHistory = records.some(
      (record) =>
        record.plateNumber.toUpperCase() === normalizedPlate &&
        (!normalizedState || record.plateState.toUpperCase() === normalizedState)
    );

    if (!hasHistory) {
      return;
    }

    setSelectedPlate({ plateState: normalizedState || undefined, plateNumber: normalizedPlate });
    setResumeMode(modalMode === "view" || modalMode === "edit" || modalMode === "vehicle" ? modalMode : null);
    setModalMode("vehicle");
  }

  function hasVehicleHistory(plateState: string, plateNumber: string) {
    const normalizedState = plateState.trim().toUpperCase();
    const normalizedPlate = plateNumber.trim().toUpperCase();

    return records.some(
      (record) =>
        record.plateNumber.toUpperCase() === normalizedPlate &&
        (!normalizedState || record.plateState.toUpperCase() === normalizedState)
    );
  }

  function getPlateSuggestions(plateNumber: string): PlateSuggestion[] {
    const normalizedPlate = plateNumber.trim().toUpperCase();

    if (normalizedPlate.length < 3) {
      return [];
    }

    const unique = new Map<string, PlateSuggestion>();

    for (const record of records) {
      if (!record.plateNumber.toUpperCase().startsWith(normalizedPlate)) {
        continue;
      }

      const key = `${record.plateState.toUpperCase()}-${record.plateNumber.toUpperCase()}`;

      if (!unique.has(key)) {
        unique.set(key, {
          plateState: record.plateState.toUpperCase(),
          plateNumber: record.plateNumber.toUpperCase()
        });
      }
    }

    return Array.from(unique.values()).sort((left, right) => left.plateNumber.localeCompare(right.plateNumber));
  }

  function getPlateHistoryStats(plateState: string, plateNumber: string) {
    const normalizedState = plateState.trim().toUpperCase();
    const normalizedPlate = plateNumber.trim().toUpperCase();

    if (!normalizedPlate || normalizedPlate.length < 3) {
      return null;
    }

    const matches = records.filter(
      (record) =>
        record.plateNumber.toUpperCase() === normalizedPlate &&
        (!normalizedState || record.plateState.toUpperCase() === normalizedState)
    );

    if (!matches.length) {
      return null;
    }

    return {
      citations: matches.filter((record) => record.recordType === "citation").length,
      warnings: matches.filter((record) => record.recordType === "warning").length,
      chalks: matches.filter((record) => record.recordType === "chalk").length
    };
  }

  function getViolationCountsForLocation(locationId: string) {
    const counts = new Map<string, number>();

    for (const record of records) {
      if (record.locationId !== locationId || record.voidedAt) {
        continue;
      }

      counts.set(record.violationId, (counts.get(record.violationId) ?? 0) + 1);
    }

    return counts;
  }

  function openRecordFromVehicle(recordId: string) {
    setSelectedRecordId(recordId);
    setModalMode("view");
    setShowDeleteConfirm(false);
  }

  function openLocationModal() {
    setResumeMode(modalMode === "view" || modalMode === "edit" || modalMode === "vehicle" ? modalMode : null);
    setModalMode("location");
  }

  function openViolationModal() {
    setResumeMode(modalMode === "view" || modalMode === "edit" || modalMode === "vehicle" ? modalMode : null);
    setModalMode("violation");
  }

  function closeModal() {
    if (modalMode === "location" || modalMode === "violation") {
      setModalMode(resumeMode);
      setResumeMode(null);
      return;
    }

    setSelectedRecordId(null);
    setSelectedPlate(null);
    setModalMode(null);
    setResumeMode(null);
    setShowDeleteConfirm(false);
    setShowVoidConfirm(false);
  }

  function resetFilters() {
    setSearchTerm("");
    setFilters({
      startDate: "",
      endDate: "",
      locationName: "all",
      violationLabel: "all",
      createdByName: "all",
      recordType: "all"
    });
  }

  return (
    <div className="grid">
      <div className="page-head">
        <div>
          <h2>Citations</h2>
        </div>
      </div>

      {created ? <div className="notice">Record created successfully.</div> : null}
      {archived ? <div className="notice">Record deleted successfully.</div> : null}

      <section className="panel workspace-compose">
        <div className="page-head">
          <h3>Write Record</h3>
          <fieldset className="fieldset-reset workspace-header-toggle">
            <div className="toggle-group">
              <label className="toggle-option">
                <input
                  form="workspace-create-form"
                  type="radio"
                  name="recordType"
                  value="citation"
                  checked={createRecordType === "citation"}
                  onChange={() => setCreateRecordType("citation")}
                />
                <span>Citation</span>
              </label>
              <label className="toggle-option">
                <input
                  form="workspace-create-form"
                  type="radio"
                  name="recordType"
                  value="warning"
                  checked={createRecordType === "warning"}
                  onChange={() => setCreateRecordType("warning")}
                />
                <span>Warning</span>
              </label>
              <label className="toggle-option">
                <input
                  form="workspace-create-form"
                  type="radio"
                  name="recordType"
                  value="chalk"
                  checked={createRecordType === "chalk"}
                  onChange={() => setCreateRecordType("chalk")}
                />
                <span>Chalk</span>
              </label>
            </div>
          </fieldset>
        </div>
        <RecordForm
          formId="workspace-create-form"
          key={`create-${createFormVersion}`}
          mode="create"
          locations={locations}
          violations={violations}
          initial={{ recordType: createRecordType }}
          showRecordTypeField={false}
          selectedRecordType={createRecordType}
          onRecordTypeChange={setCreateRecordType}
          onPlateLookup={hasVehicleHistory}
          getPlateSuggestions={getPlateSuggestions}
          getPlateHistoryStats={getPlateHistoryStats}
          getDuplicateCandidate={getDuplicateCandidate}
          locationViolationAssignments={locationViolationAssignments}
          getViolationCountsForLocation={getViolationCountsForLocation}
          onOpenVehicleHistory={openVehicleProfile}
          onOpenDuplicateRecord={openDuplicateRecord}
          onAddLocation={openLocationModal}
          onAddViolation={openViolationModal}
          onSuccess={handleCreatedRecord}
        />
      </section>

      <section className="panel workspace-records">
        <div className="page-head">
          <div>
            <h3>Vehicle and Record History</h3>
            <p className="muted">Click any vehicle row to open the full record popup.</p>
          </div>
        </div>
        <label className="field workspace-search">
          <span>Search</span>
          <input
            type="text"
            placeholder="Plate, location, violation, officer"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>
        <div className="history-filter-grid">
          <label className="field">
            <span>Start Date</span>
            <input type="date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} />
          </label>
          <label className="field">
            <span>End Date</span>
            <input type="date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} />
          </label>
          <label className="field">
            <span>Location</span>
            <select value={filters.locationName} onChange={(event) => setFilters((current) => ({ ...current, locationName: event.target.value }))}>
              <option value="all">All</option>
              {uniqueLocations.map((locationName) => (
                <option key={locationName} value={locationName}>
                  {locationName}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Violation</span>
            <select value={filters.violationLabel} onChange={(event) => setFilters((current) => ({ ...current, violationLabel: event.target.value }))}>
              <option value="all">All</option>
              {uniqueViolations.map((violationLabel) => (
                <option key={violationLabel} value={violationLabel}>
                  {violationLabel}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Created By</span>
            <select value={filters.createdByName} onChange={(event) => setFilters((current) => ({ ...current, createdByName: event.target.value }))}>
              <option value="all">All</option>
              {uniqueCreators.map((createdByName) => (
                <option key={createdByName} value={createdByName}>
                  {createdByName}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Record Type</span>
            <select
              value={filters.recordType}
              onChange={(event) =>
                setFilters((current) => ({ ...current, recordType: event.target.value as HistoryFilters["recordType"] }))
              }
            >
              <option value="all">All</option>
              <option value="citation">Citation</option>
              <option value="warning">Warning</option>
              <option value="chalk">Chalk</option>
            </select>
          </label>
        </div>
        <div>
          <button className="button-secondary button-inline" type="button" onClick={resetFilters}>
            Clear Filters
          </button>
        </div>
        {restoreState.error ? <div className="notice notice-error">{restoreState.error}</div> : null}
        {restoreState.success ? <div className="notice">{restoreState.success}</div> : null}
        <PaginationControls
          historyPage={historyPage}
          totalHistoryPages={totalHistoryPages}
          onPrevious={() => setHistoryPage((page) => Math.max(1, page - 1))}
          onNext={() => setHistoryPage((page) => Math.min(totalHistoryPages, page + 1))}
        />
        <table>
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Type</th>
              <th>Occurred</th>
              <th>Location</th>
              <th>Violation</th>
              <th>Fine</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length ? (
              pagedRecords.map((record) => (
                <tr key={record.id} className={record.voidedAt ? "clickable-row row-voided" : "clickable-row"} onClick={() => openRecord(record.id)}>
                  <td>
                    <button
                      className="link-button"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openVehicleProfile(record.plateState, record.plateNumber);
                      }}
                    >
                      <strong>
                        {record.plateState} {record.plateNumber}
                      </strong>
                    </button>
                  </td>
                  <td>
                    <StatusBadge recordType={record.recordType} />
                  </td>
                  <td>{formatDateTime(record.occurredAt)}</td>
                  <td>{record.locationName}</td>
                  <td>{record.violationLabel}</td>
                  <td>{formatCurrency(record.fineAmount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="muted">
                  No matching records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <PaginationControls
          historyPage={historyPage}
          totalHistoryPages={totalHistoryPages}
          onPrevious={() => setHistoryPage((page) => Math.max(1, page - 1))}
          onNext={() => setHistoryPage((page) => Math.min(totalHistoryPages, page + 1))}
        />
        {archivedRecords.length ? (
          <section className="panel grid">
            <div className="page-head" style={{ marginBottom: 0 }}>
              <h3>Archived Citations</h3>
              <button className="button-secondary button-inline" type="button" onClick={() => setShowArchivedRecords((current) => !current)}>
                {showArchivedRecords ? "Hide" : `Show (${archivedRecords.length})`}
              </button>
            </div>
            {showArchivedRecords ? (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Vehicle</th>
                    <th>Violation</th>
                    <th>Location</th>
                    <th>Deleted Reason</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                    {pagedArchivedRecords.map((record) => (
                    <tr key={record.id}>
                      <td>{formatDateTime(record.occurredAt)}</td>
                      <td>{record.plateState} {record.plateNumber}</td>
                      <td>{record.violationLabel}</td>
                      <td>{record.locationName}</td>
                      <td>{record.archiveReason || "No reason recorded."}</td>
                      <td>
                        <form action={restoreAction}>
                          <input type="hidden" name="id" value={record.id} />
                          <button className="button-secondary button-inline" type="submit" disabled={restorePending}>
                            Restore
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </section>
        ) : null}
      </section>

      {modalMode === "location" ? (
        <Modal title="Manage Locations" onClose={closeModal}>
          <div className="grid">
            {locationDeleteState.error ? <div className="notice notice-error">{locationDeleteState.error}</div> : null}
            {locationDeleteState.success ? <div className="notice">{locationDeleteState.success}</div> : null}
            {locationUpdateState.error ? <div className="notice notice-error">{locationUpdateState.error}</div> : null}
            {locationUpdateState.success ? <div className="notice">{locationUpdateState.success}</div> : null}
            <form action={locationAction} className="grid">
              <label className="field">
                <span>New Location</span>
                <input type="text" name="name" required />
              </label>
              {locationState.error ? <p className="error">{locationState.error}</p> : null}
              {locationState.success ? <div className="notice">{locationState.success}</div> : null}
              <div>
                <button className="button" type="submit" disabled={locationPending}>
                  {locationPending ? "Saving..." : "Add Location"}
                </button>
              </div>
            </form>

            {assigningLocationId ? (
              <section className="panel grid">
                <div className="page-head" style={{ marginBottom: 0 }}>
                  <h3>
                    Violations For {allLocations.find((location) => location.id === assigningLocationId)?.name ?? "Location"}
                  </h3>
                  <button className="button-secondary button-inline" type="button" onClick={() => setAssigningLocationId(null)}>
                    Close
                  </button>
                </div>
                <form action={locationAssignmentAction} className="grid">
                  <input type="hidden" name="locationId" value={assigningLocationId} />
                  <div className="assignment-grid">
                    {allViolations.map((violation) => {
                      const checked = locationViolationAssignments.some(
                        (item) => item.locationId === assigningLocationId && item.violationId === violation.id
                      );

                      return (
                        <label key={violation.id} className="assignment-option">
                          <input type="checkbox" name="violationIds" value={violation.id} defaultChecked={checked} />
                          <span>{violation.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {locationAssignmentState.error ? <div className="notice notice-error">{locationAssignmentState.error}</div> : null}
                  {locationAssignmentState.success ? <div className="notice">{locationAssignmentState.success}</div> : null}
                  <div>
                    <button className="button" type="submit" disabled={locationAssignmentPending}>
                      {locationAssignmentPending ? "Saving..." : "Save Violations"}
                    </button>
                  </div>
                </form>
              </section>
            ) : null}

            <div className={assigningLocationId ? "manager-list manager-list-compact grid" : "manager-list grid"}>
              {allLocations.map((location) => (
                <div key={location.id} className="manager-row panel">
                  {editingLocationId === location.id ? (
                    <form action={locationUpdateAction} className="manager-edit-form">
                      <input type="hidden" name="id" value={location.id} />
                      <input type="text" name="name" defaultValue={location.name} required />
                      <button className="button-secondary button-inline" type="submit" disabled={locationUpdatePending}>
                        Save
                      </button>
                      <button className="button-secondary button-inline" type="button" onClick={() => setEditingLocationId(null)}>
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <div>
                        <strong>{location.name}</strong>
                      </div>
                      <div className="manager-actions">
                        <button className="button-secondary button-inline" type="button" onClick={() => setEditingLocationId(location.id)}>
                          Edit
                        </button>
                        <button className="button-secondary button-inline" type="button" onClick={() => setAssigningLocationId(location.id)}>
                          Violations
                        </button>
                        <form action={locationDeleteAction}>
                          <input type="hidden" name="id" value={location.id} />
                          <button className="button-secondary button-inline" type="submit" disabled={locationDeletePending}>
                            Delete
                          </button>
                        </form>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      ) : null}

      {modalMode === "violation" ? (
        <Modal title="Manage Violations" onClose={closeModal}>
          <div className="grid">
            {violationDeleteState.error ? <div className="notice notice-error">{violationDeleteState.error}</div> : null}
            {violationDeleteState.success ? <div className="notice">{violationDeleteState.success}</div> : null}
            {violationUpdateState.error ? <div className="notice notice-error">{violationUpdateState.error}</div> : null}
            {violationUpdateState.success ? <div className="notice">{violationUpdateState.success}</div> : null}
            <form action={violationAction} className="grid">
              <div className="form-grid">
                <label className="field">
                  <span>Violation</span>
                  <input type="text" name="label" required />
                </label>
                <label className="field">
                  <span>Default Fine</span>
                  <input type="text" name="defaultFine" defaultValue="0.00" required />
                </label>
              </div>
              {violationState.error ? <p className="error">{violationState.error}</p> : null}
              {violationState.success ? <div className="notice">{violationState.success}</div> : null}
              <div>
                <button className="button" type="submit" disabled={violationPending}>
                  {violationPending ? "Saving..." : "Add Violation"}
                </button>
              </div>
            </form>

            <div className="manager-list grid">
              {allViolations.map((violation) => (
                <div key={violation.id} className="manager-row panel">
                  {editingViolationId === violation.id ? (
                    <form action={violationUpdateAction} className="manager-edit-grid">
                      <input type="hidden" name="id" value={violation.id} />
                      <input type="text" name="label" defaultValue={violation.label} required />
                      <input type="text" name="defaultFine" defaultValue={violation.defaultFine} required />
                      <div className="manager-actions">
                        <button className="button-secondary button-inline" type="submit" disabled={violationUpdatePending}>
                          Save
                        </button>
                        <button className="button-secondary button-inline" type="button" onClick={() => setEditingViolationId(null)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div>
                        <strong>{violation.label}</strong>
                        <div className="muted">{formatCurrency(violation.defaultFine)}</div>
                      </div>
                      <div className="manager-actions">
                        <button className="button-secondary button-inline" type="button" onClick={() => setEditingViolationId(violation.id)}>
                          Edit
                        </button>
                        <form action={violationDeleteAction}>
                          <input type="hidden" name="id" value={violation.id} />
                          <button className="button-secondary button-inline" type="submit" disabled={violationDeletePending}>
                            Delete
                          </button>
                        </form>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      ) : null}

      {selectedRecord && modalMode === "view" ? (
        <Modal title={`${selectedRecord.plateState} ${selectedRecord.plateNumber}`} onClose={closeModal}>
          <div className="grid">
            <div className="page-head" style={{ marginBottom: 0 }}>
              <StatusBadge recordType={selectedRecord.recordType} />
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button className="button-secondary" type="button" onClick={() => setModalMode("edit")}>
                  Edit
                </button>
                {!selectedRecord.voidedAt ? (
                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setShowVoidConfirm((current) => !current);
                    }}
                  >
                    Void Ticket
                  </button>
                ) : null}
                <button className="button-danger" type="button" onClick={() => setShowDeleteConfirm((current) => !current)}>
                  Delete
                </button>
              </div>
            </div>

            {!selectedRecord.voidedAt && showVoidConfirm ? (
              <form id="void-ticket-form" action={voidAction} className="panel grid">
                <input type="hidden" name="id" value={selectedRecord.id} />
                <label className="field">
                  <span>Void Reason</span>
                  <textarea name="voidReason" required />
                </label>
                {voidState.error ? <p className="error">{voidState.error}</p> : null}
                {voidState.success ? <div className="notice">{voidState.success}</div> : null}
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button className="button-secondary" type="submit" disabled={voidPending}>
                    {voidPending ? "Voiding..." : "Confirm Void"}
                  </button>
                  <button className="button-secondary" type="button" onClick={() => setShowVoidConfirm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}

            <div className="form-grid">
              <div>
                <strong>Occurred</strong>
                <p>{formatDateTime(selectedRecord.occurredAt)}</p>
              </div>
              <div>
                <strong>Officer</strong>
                <p>{selectedRecord.officerNumber}</p>
              </div>
              <div>
                <strong>Location</strong>
                <p>{selectedRecord.locationName}</p>
              </div>
              <div>
                <strong>Violation</strong>
                <p>{selectedRecord.violationLabel}</p>
              </div>
              <div>
                <strong>Chalk Time</strong>
                <p>{selectedRecord.chalkTime || "Not recorded"}</p>
              </div>
              <div>
                <strong>Fine</strong>
                <p>{formatCurrency(selectedRecord.fineAmount)}</p>
              </div>
              <div>
                <strong>Status</strong>
                <p>{selectedRecord.voidedAt ? "Voided" : "Active"}</p>
              </div>
              <div>
                <strong>Created By</strong>
                <p>{selectedRecord.createdByName}</p>
              </div>
              <div>
                <strong>Updated At</strong>
                <p>{formatDateTime(selectedRecord.updatedAt)}</p>
              </div>
            </div>

            <div>
              <strong>Comment</strong>
              <p>{selectedRecord.comment || "No comment."}</p>
            </div>

            {selectedRecord.voidedAt ? (
              <div>
                <strong>Void Reason</strong>
                <p>{selectedRecord.voidReason || "No reason recorded."}</p>
              </div>
            ) : null}

            <div>
              <button
                className="button-secondary"
                type="button"
                onClick={() => openVehicleProfile(selectedRecord.plateState, selectedRecord.plateNumber)}
              >
                View Vehicle History
              </button>
            </div>

            {showDeleteConfirm ? (
              <form action={archiveAction} className="panel grid">
                <input type="hidden" name="id" value={selectedRecord.id} />
                <label className="field">
                  <span>Delete Reason</span>
                  <textarea name="archiveReason" required />
                </label>
                {archiveState.error ? <p className="error">{archiveState.error}</p> : null}
                <div>
                  <button className="button-danger" type="submit" disabled={archivePending}>
                    {archivePending ? "Deleting..." : "Confirm Delete"}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {selectedPlate && vehicleSummary && modalMode === "vehicle" ? (
        <Modal title={selectedPlate.plateState ? `${selectedPlate.plateState} ${selectedPlate.plateNumber}` : selectedPlate.plateNumber} onClose={closeModal}>
          <div className="grid">
            <div className="vehicle-summary-grid">
              <div className="panel">
                <span className="muted">Repeat Count</span>
                <strong className="vehicle-summary-value">{vehicleSummary.repeatCount}</strong>
              </div>
              <div className="panel">
                <span className="muted">Last Citation</span>
                <strong className="vehicle-summary-text">
                  {vehicleSummary.lastCitation ? formatDateTime(vehicleSummary.lastCitation.occurredAt) : "None"}
                </strong>
              </div>
              <div className="panel">
                <span className="muted">Last Warning</span>
                <strong className="vehicle-summary-text">
                  {vehicleSummary.lastWarning ? formatDateTime(vehicleSummary.lastWarning.occurredAt) : "None"}
                </strong>
              </div>
            </div>

            <section className="panel grid">
              <h3>Notes</h3>
              <form action={vehicleNoteAction} className="grid">
                <input type="hidden" name="plateState" value={selectedPlate.plateState ?? vehicleRecords[0]?.plateState ?? ""} />
                <input type="hidden" name="plateNumber" value={selectedPlate.plateNumber} />
                <label className="field">
                  <span>Persistent Vehicle Note</span>
                  <textarea name="note" defaultValue={selectedVehicleNote?.note ?? ""} />
                </label>
                {selectedVehicleNote ? (
                  <p className="muted">Updated by {selectedVehicleNote.updatedByName} on {formatDateTime(selectedVehicleNote.updatedAt)}</p>
                ) : null}
                {vehicleSummary.notes.length ? (
                  <div>
                    <strong>Recent citation comments</strong>
                    <ul className="notes-list">
                      {vehicleSummary.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {vehicleNoteState.error ? <div className="notice notice-error">{vehicleNoteState.error}</div> : null}
                {vehicleNoteState.success ? <div className="notice">{vehicleNoteState.success}</div> : null}
                <div>
                  <button className="button" type="submit" disabled={vehicleNotePending}>
                    {vehicleNotePending ? "Saving..." : "Save Vehicle Note"}
                  </button>
                </div>
              </form>
            </section>

            <section className="panel grid">
              <h3>Ticket History</h3>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Violation</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleRecords.map((record) => (
                    <tr key={record.id} className="clickable-row" onClick={() => openRecordFromVehicle(record.id)}>
                      <td>{formatDateTime(record.occurredAt)}</td>
                      <td>{record.violationLabel}</td>
                      <td>{record.locationName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </Modal>
      ) : null}

      {selectedRecord && modalMode === "edit" ? (
        <Modal title="Edit Record" onClose={closeModal}>
          <RecordForm
            key={selectedRecord.id}
            mode="edit"
            locations={locations}
            violations={violations}
            initial={{
              id: selectedRecord.id,
              recordType: selectedRecord.recordType,
              date: new Date(selectedRecord.occurredAt).toLocaleDateString("en-CA"),
              time: new Date(selectedRecord.occurredAt).toLocaleTimeString("en-US", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit"
              }),
              locationId: selectedRecord.locationId,
              chalkTime: selectedRecord.chalkTime ?? "",
              violationId: selectedRecord.violationId,
              fineAmount: selectedRecord.fineAmount,
              plateState: selectedRecord.plateState,
              plateNumber: selectedRecord.plateNumber,
              comment: selectedRecord.comment
            }}
            onPlateLookup={hasVehicleHistory}
            getPlateSuggestions={getPlateSuggestions}
            getPlateHistoryStats={getPlateHistoryStats}
            getDuplicateCandidate={getDuplicateCandidate}
            locationViolationAssignments={locationViolationAssignments}
            getViolationCountsForLocation={getViolationCountsForLocation}
            onOpenVehicleHistory={openVehicleProfile}
            onOpenDuplicateRecord={openDuplicateRecord}
            onAddViolation={openViolationModal}
            onAddLocation={openLocationModal}
            onSuccess={handleUpdatedRecord}
            submitLabel="Save Record"
          />
        </Modal>
      ) : null}
    </div>
  );
}
