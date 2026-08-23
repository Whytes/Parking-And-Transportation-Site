"use client";

import { useActionState, useEffect, useState } from "react";

import {
  createRecordAction,
  updateRecordAction
} from "@/lib/actions/records";
import { emptyRecordValues, type DuplicateCandidate, type RecordFormState, type RecordFormValues, type WorkspaceRecord } from "@/lib/record-form";
import { toLocalDateInputValue, toLocalTimeInputValue } from "@/lib/utils";

type Option = {
  id: string;
  name?: string;
  code?: string;
  label?: string;
  defaultFine?: string;
};

type PlateSuggestion = {
  plateState: string;
  plateNumber: string;
};

type PlateHistoryStats = {
  citations: number;
  warnings: number;
  chalks: number;
};

type VehicleAlert = {
  plateState: string;
  plateNumber: string;
  isTowBolo: boolean;
  note: string;
  updatedAt: string;
  updatedByName: string;
};

type LocationViolationAssignment = {
  locationId: string;
  violationId: string;
};

const initialValues: RecordFormValues = {
  ...emptyRecordValues,
  date: toLocalDateInputValue(),
  time: toLocalTimeInputValue(),
  plateState: "GA",
  fineAmount: "0.00"
};

export function RecordForm({
  mode,
  locations,
  violations,
  initial,
  formId,
  showRecordTypeField = true,
  selectedRecordType,
  onRecordTypeChange,
  onPlateLookup,
  getPlateSuggestions,
  getPlateHistoryStats,
  getVehicleAlert,
  getDuplicateCandidate,
  locationViolationAssignments,
  getViolationCountsForLocation,
  onOpenVehicleHistory,
  onOpenDuplicateRecord,
  onAddLocation,
  onAddViolation,
  onSuccess,
  submitLabel
}: {
  mode: "create" | "edit";
  locations: Option[];
  violations: Option[];
  initial?: Partial<RecordFormValues>;
  formId?: string;
  showRecordTypeField?: boolean;
  selectedRecordType?: RecordFormValues["recordType"];
  onRecordTypeChange?: (value: RecordFormValues["recordType"]) => void;
  onPlateLookup?: (plateState: string, plateNumber: string) => boolean;
  getPlateSuggestions?: (plateNumber: string) => PlateSuggestion[];
  getPlateHistoryStats?: (plateState: string, plateNumber: string) => PlateHistoryStats | null;
  getVehicleAlert?: (plateState: string, plateNumber: string) => VehicleAlert | null;
  getDuplicateCandidate?: (input: {
    id?: string;
    plateState: string;
    plateNumber: string;
    locationId: string;
    violationId: string;
    date: string;
    time: string;
  }) => DuplicateCandidate | null;
  locationViolationAssignments?: LocationViolationAssignment[];
  getViolationCountsForLocation?: (locationId: string) => Map<string, number>;
  onOpenVehicleHistory?: (plateState: string, plateNumber: string) => void;
  onOpenDuplicateRecord?: (recordId: string) => void;
  onAddLocation?: () => void;
  onAddViolation?: () => void;
  onSuccess?: (record: WorkspaceRecord) => void;
  submitLabel?: string;
}) {
  const seedValues = {
    ...initialValues,
    ...initial
  };
  const initialState: RecordFormState = {
    values: seedValues
  };
  const [state, formAction, pending] = useActionState(mode === "create" ? createRecordAction : updateRecordAction, initialState);
 const [localRecordType, setLocalRecordType] = useState<RecordFormValues["recordType"]>(seedValues.recordType);
  const [plateStateValue, setPlateStateValue] = useState(seedValues.plateState);
  const [plateNumberValue, setPlateNumberValue] = useState(seedValues.plateNumber);
  const [violationIdValue, setViolationIdValue] = useState(seedValues.violationId);
  const [dateValue, setDateValue] = useState(seedValues.date);
  const [timeValue, setTimeValue] = useState(seedValues.time);
  const [locationIdValue, setLocationIdValue] = useState(seedValues.locationId);
  const values = state.values;
  const currentRecordType = selectedRecordType ?? localRecordType;
  const selectedViolation = violations.find((violation) => violation.id === violationIdValue);
  const citationFineAmount = selectedViolation?.defaultFine ?? values.fineAmount;
  const allowedViolationIds = locationIdValue
    ? new Set((locationViolationAssignments ?? []).filter((item) => item.locationId === locationIdValue).map((item) => item.violationId))
    : null;
  const violationCountsForLocation = locationIdValue ? getViolationCountsForLocation?.(locationIdValue) ?? new Map<string, number>() : new Map<string, number>();
  const visibleViolations = [...(allowedViolationIds ? violations.filter((violation) => allowedViolationIds.has(violation.id)) : violations)].sort(
    (left, right) => {
      const countDiff = (violationCountsForLocation.get(right.id) ?? 0) - (violationCountsForLocation.get(left.id) ?? 0);

      if (countDiff !== 0) {
        return countDiff;
      }

      return (left.label ?? "").localeCompare(right.label ?? "");
    }
  );
  const plateSuggestions = plateNumberValue.trim().length >= 3 ? (getPlateSuggestions?.(plateNumberValue) ?? []) : [];
  const hasVehicleHistory = plateNumberValue.trim()
    ? (onPlateLookup?.(plateStateValue.trim().toUpperCase(), plateNumberValue.trim().toUpperCase()) ?? false)
    : false;
  const plateHistoryStats = plateNumberValue.trim().length >= 3 ? (getPlateHistoryStats?.(plateStateValue, plateNumberValue) ?? null) : null;
  const vehicleAlert = plateNumberValue.trim().length >= 3 ? (getVehicleAlert?.(plateStateValue, plateNumberValue) ?? null) : null;
  const duplicateCandidate = getDuplicateCandidate?.({
    id: values.id,
    plateState: plateStateValue,
    plateNumber: plateNumberValue,
    locationId: locationIdValue,
    violationId: violationIdValue,
    date: dateValue,
    time: timeValue
  }) ?? null;

  useEffect(() => {
    if (state.success && state.savedRecord && onSuccess) {
      onSuccess(state.savedRecord);
    }
  }, [onSuccess, state.savedRecord, state.success]);

  useEffect(() => {
    setLocalRecordType(seedValues.recordType);
    setPlateStateValue(seedValues.plateState);
    setPlateNumberValue(seedValues.plateNumber);
    setViolationIdValue(seedValues.violationId);
    setDateValue(seedValues.date);
    setTimeValue(seedValues.time);
    setLocationIdValue(seedValues.locationId);
  }, [seedValues.recordType, seedValues.plateNumber, seedValues.plateState, seedValues.violationId, seedValues.date, seedValues.time, seedValues.locationId]);

  function handleRecordTypeChange(value: RecordFormValues["recordType"]) {
    setLocalRecordType(value);
    onRecordTypeChange?.(value);
  }

  function toggleStateShortcut() {
    setPlateStateValue((current) => (current.trim().toUpperCase() === "FL" ? "GA" : "FL"));
  }

  return (
    <form id={formId} action={formAction} className="grid">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {!showRecordTypeField ? <input type="hidden" name="recordType" value={currentRecordType} /> : null}
      <div className="form-grid">
        {showRecordTypeField ? (
          <fieldset className="field fieldset-reset">
            <div className="toggle-group">
              <label className="toggle-option toggle-option-citation">
                <input
                  type="radio"
                  name="recordType"
                  value="citation"
                  checked={currentRecordType === "citation"}
                  onChange={() => handleRecordTypeChange("citation")}
                />
                <span>Citation</span>
              </label>
              <label className="toggle-option toggle-option-warning">
                <input
                  type="radio"
                  name="recordType"
                  value="warning"
                  checked={currentRecordType === "warning"}
                  onChange={() => handleRecordTypeChange("warning")}
                />
                <span>Warning</span>
              </label>
              <label className="toggle-option toggle-option-chalk">
                <input
                  type="radio"
                  name="recordType"
                  value="chalk"
                  checked={currentRecordType === "chalk"}
                  onChange={() => handleRecordTypeChange("chalk")}
                />
                <span>Chalk</span>
              </label>
            </div>
            {state.fieldErrors?.recordType ? <span className="error">{state.fieldErrors.recordType}</span> : null}
          </fieldset>
        ) : null}
        <label className="field">
          <span>Date</span>
          <input type="date" name="date" value={dateValue} onChange={(event) => setDateValue(event.target.value)} required />
          {state.fieldErrors?.date ? <span className="error">{state.fieldErrors.date}</span> : null}
        </label>
        <label className="field">
          <span>Time</span>
          <input type="time" name="time" value={timeValue} onChange={(event) => setTimeValue(event.target.value)} required />
          {state.fieldErrors?.time ? <span className="error">{state.fieldErrors.time}</span> : null}
        </label>
        <label className="field">
          <span className="field-label-row">
            <span>Location</span>
            {onAddLocation ? (
              <button className="icon-button" type="button" onClick={onAddLocation} aria-label="Add location" title="Add location">
                +
              </button>
            ) : null}
          </span>
          <select name="locationId" value={locationIdValue} onChange={(event) => setLocationIdValue(event.target.value)} required>
            <option value="">Select location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          {state.fieldErrors?.locationId ? <span className="error">{state.fieldErrors.locationId}</span> : null}
        </label>
        {currentRecordType === "chalk" ? (
          <label className="field">
            <span>Chalk Time</span>
            <input type="time" name="chalkTime" defaultValue={values.chalkTime} />
            {state.fieldErrors?.chalkTime ? <span className="error">{state.fieldErrors.chalkTime}</span> : null}
          </label>
        ) : null}
        {currentRecordType !== "chalk" ? (
          <label className="field">
            <span className="field-label-row">
              <span>Violation</span>
              {onAddViolation ? (
                <button className="icon-button" type="button" onClick={onAddViolation} aria-label="Add violation" title="Add violation">
                  +
                </button>
              ) : null}
            </span>
            <select name="violationId" value={violationIdValue} onChange={(event) => setViolationIdValue(event.target.value)} required>
              <option value="">Select violation</option>
              {visibleViolations.map((violation) => (
                <option key={violation.id} value={violation.id}>
                  {violation.label}
                </option>
              ))}
            </select>
            {state.fieldErrors?.violationId ? <span className="error">{state.fieldErrors.violationId}</span> : null}
          </label>
        ) : null}
        {currentRecordType === "citation" ? (
          <label className="field">
            <span>Fine Amount</span>
            <input type="hidden" name="fineAmount" value={citationFineAmount} />
            <div className="static-field">{selectedViolation ? `$${Math.round(Number(selectedViolation.defaultFine || 0))}` : "Select a violation"}</div>
            {state.fieldErrors?.fineAmount ? <span className="error">{state.fieldErrors.fineAmount}</span> : null}
          </label>
        ) : (
          <input type="hidden" name="fineAmount" value="0" />
        )}
        <label className="field">
          <span className="field-label-row">
            <span>State</span>
            {hasVehicleHistory ? (
              <div className="field-label-actions">
                <button className="button-secondary button-inline" type="button" onClick={toggleStateShortcut}>
                  GA/FL
                </button>
                <button
                  className="button-secondary button-inline"
                  type="button"
                  onClick={() => onOpenVehicleHistory?.(plateStateValue.trim().toUpperCase(), plateNumberValue.trim().toUpperCase())}
                >
                  Vehicle History
                </button>
              </div>
            ) : (
              <div className="field-label-actions">
                <button className="button-secondary button-inline" type="button" onClick={toggleStateShortcut}>
                  GA/FL
                </button>
              </div>
            )}
          </span>
          <input
            type="text"
            name="plateState"
            value={plateStateValue}
            required
            maxLength={10}
            onChange={(event) => setPlateStateValue(event.target.value.toUpperCase())}
          />
          {state.fieldErrors?.plateState ? <span className="error">{state.fieldErrors.plateState}</span> : null}
        </label>
        <label className="field">
          <span>Plate Number</span>
          <div className="field-input-row">
            <input
              type="text"
              name="plateNumber"
              value={plateNumberValue}
              required
              maxLength={20}
              onChange={(event) => setPlateNumberValue(event.target.value.toUpperCase())}
            />
            {plateSuggestions.length ? (
              <span className="plate-suggestions-inline">
                {plateSuggestions.slice(0, 4).map((suggestion) => (
                  <button
                    key={`${suggestion.plateState}-${suggestion.plateNumber}`}
                    className="button-secondary button-inline"
                    type="button"
                    onClick={() => {
                      setPlateStateValue(suggestion.plateState);
                      setPlateNumberValue(suggestion.plateNumber);
                    }}
                  >
                    {suggestion.plateNumber}
                  </button>
                ))}
              </span>
            ) : null}
          </div>
          {plateHistoryStats || vehicleAlert?.isTowBolo ? (
            <div className="plate-intelligence-row">
              {plateHistoryStats?.citations ? <span className="history-badge history-badge-citation">{plateHistoryStats.citations} prior citation{plateHistoryStats.citations === 1 ? "" : "s"}</span> : null}
              {plateHistoryStats?.warnings ? <span className="history-badge history-badge-warning">{plateHistoryStats.warnings} warning{plateHistoryStats.warnings === 1 ? "" : "s"}</span> : null}
              {plateHistoryStats?.chalks ? <span className="history-badge history-badge-chalk">{plateHistoryStats.chalks} chalk{plateHistoryStats.chalks === 1 ? "" : "s"}</span> : null}
              {vehicleAlert?.isTowBolo ? <span className="history-badge history-badge-tow">Tow BOLO</span> : null}
            </div>
          ) : null}
          {vehicleAlert?.isTowBolo ? (
            <div className="notice notice-error">
              Tow BOLO on file{vehicleAlert.note ? `: ${vehicleAlert.note}` : "."}
            </div>
          ) : null}
          {state.fieldErrors?.plateNumber ? <span className="error">{state.fieldErrors.plateNumber}</span> : null}
        </label>
      </div>
      <label className="field">
        <span>Comment</span>
        <textarea name="comment" defaultValue={values.comment} />
        {state.fieldErrors?.comment ? <span className="error">{state.fieldErrors.comment}</span> : null}
      </label>
      {state.error ? <p className="error">{state.error}</p> : null}
      {duplicateCandidate && !state.requiresDuplicateConfirmation ? (
        <div className="notice notice-warning">
          Possible duplicate found: {new Date(duplicateCandidate.occurredAt).toLocaleString()} · {duplicateCandidate.locationName} · {duplicateCandidate.violationLabel}
        </div>
      ) : null}
      {state.duplicateWarning ? (
        <div className="notice notice-warning">
          {state.duplicateWarning}
          {state.duplicateRecordId ? (
            <>
              {" "}
              <button className="link-button" type="button" onClick={() => onOpenDuplicateRecord?.(state.duplicateRecordId!)}>
                Open existing record
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {state.success ? <p className="notice">{state.success}</p> : null}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button className="button" type="submit" disabled={pending}>
          {pending ? "Saving..." : submitLabel ?? (mode === "create" ? "Create Record" : "Save Changes")}
        </button>
        {state.requiresDuplicateConfirmation ? (
          <button className="button-secondary" type="submit" name="confirmDuplicate" value="true" disabled={pending}>
            Save Anyway
          </button>
        ) : null}
      </div>
    </form>
  );
}
