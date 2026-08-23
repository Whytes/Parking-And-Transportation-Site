"use client";

import { useActionState } from "react";

import { importRecordsAction, type ImportFormState } from "@/lib/actions/records";

const initialState: ImportFormState = {};

export function ImportForm() {
  const [state, formAction, pending] = useActionState(importRecordsAction, initialState);

  return (
    <div className="grid">
      <section className="panel grid">
        <div>
          <h3>Import Google Sheets CSV</h3>
          <p className="muted">Export the sheet as CSV, then upload it here. Re-importing the same file will create duplicates.</p>
        </div>
        <form action={formAction} className="grid">
          <label className="field">
            <span>CSV File</span>
            <input type="file" name="file" accept=".csv,text/csv" required />
          </label>
          <div className="field">
            <span>Confirmation</span>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" name="confirmed" value="yes" required />
              <span>I understand this import adds records and does not de-duplicate existing rows.</span>
            </label>
          </div>
          {state.error ? <p className="error">{state.error}</p> : null}
          {state.success ? <div className="notice">{state.success}</div> : null}
          {state.details ? (
            <div className="notice">
              Imported {state.details.importedCount} rows. Skipped {state.details.skippedDuplicates} duplicates. Created {state.details.createdLocations} locations and {state.details.createdViolations} violations.
            </div>
          ) : null}
          {state.rowErrors?.length ? (
            <div className="panel">
              <strong>{state.success ? "Skipped rows" : "Import issues"}</strong>
              <ul>
                {state.rowErrors.map((error, index) => (
                  <li key={`${index}-${error}`}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <button className="button" type="submit" disabled={pending}>
              {pending ? "Importing..." : "Import CSV"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel grid">
        <h3>Sheet Mapping</h3>
        <table>
          <thead>
            <tr>
              <th>Sheet Column</th>
              <th>Used As</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>A</td><td>Ignored citation number</td></tr>
            <tr><td>B</td><td>Date</td></tr>
            <tr><td>C</td><td>Time</td></tr>
            <tr><td>D</td><td>Officer name/number from sheet</td></tr>
            <tr><td>E</td><td>Location</td></tr>
            <tr><td>F</td><td>Chalk time</td></tr>
            <tr><td>G</td><td>Violation</td></tr>
            <tr><td>H</td><td>Fine amount</td></tr>
            <tr><td>I</td><td>Plate state</td></tr>
            <tr><td>J</td><td>Plate number</td></tr>
            <tr><td>K</td><td>Comment</td></tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
