"use client";

import { useActionState, useState } from "react";

import {
  createOfficerAction,
  resetOfficerPasswordAction,
  toggleOfficerActiveAction,
  updateOfficerAction,
  type OfficerActionState
} from "@/lib/actions/admin";
import { formatDateTime } from "@/lib/utils";

type OfficerRow = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "admin" | "officer";
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

const initialState: OfficerActionState = {};

export function OfficersManager({ officers }: { officers: OfficerRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [passwordResetId, setPasswordResetId] = useState<string | null>(null);
  const [createState, createAction, createPending] = useActionState(createOfficerAction, initialState);
  const [updateState, updateAction, updatePending] = useActionState(updateOfficerAction, initialState);
  const [passwordState, passwordAction, passwordPending] = useActionState(resetOfficerPasswordAction, initialState);
  const [toggleState, toggleAction, togglePending] = useActionState(toggleOfficerActiveAction, initialState);

  return (
    <div className="grid">
      <div className="page-head">
        <div>
          <h2>Officers</h2>
        </div>
      </div>

      <section className="panel grid">
        <h3>Add Officer</h3>
        <form action={createAction} className="form-grid">
          <label className="field">
            <span>Name</span>
            <input type="text" name="name" required />
          </label>
          <label className="field">
            <span>Username</span>
            <input type="text" name="username" required />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" name="email" required />
          </label>
          <label className="field">
            <span>Role</span>
            <select name="role" defaultValue="officer">
              <option value="officer">Officer</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" name="password" required minLength={8} />
          </label>
          <div style={{ alignSelf: "end" }}>
            <button className="button" type="submit" disabled={createPending}>
              {createPending ? "Saving..." : "Create Officer"}
            </button>
          </div>
        </form>
        {createState.error ? <div className="notice notice-error">{createState.error}</div> : null}
        {createState.success ? <div className="notice">{createState.success}</div> : null}
      </section>

      {updateState.error || passwordState.error || toggleState.error ? (
        <div className="notice notice-error">{updateState.error ?? passwordState.error ?? toggleState.error}</div>
      ) : null}
      {updateState.success || passwordState.success || toggleState.success ? (
        <div className="notice">{updateState.success ?? passwordState.success ?? toggleState.success}</div>
      ) : null}

      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {officers.map((officer) => (
              <tr key={officer.id}>
                <td>
                  {editingId === officer.id ? (
                    <form action={updateAction} className="manager-edit-grid">
                      <input type="hidden" name="id" value={officer.id} />
                      <input type="text" name="name" defaultValue={officer.name} required />
                      <input type="text" name="username" defaultValue={officer.username} required />
                      <input type="email" name="email" defaultValue={officer.email} required />
                      <select name="role" defaultValue={officer.role}>
                        <option value="officer">Officer</option>
                        <option value="admin">Admin</option>
                      </select>
                      <div className="manager-actions">
                        <button className="button-secondary button-inline" type="submit" disabled={updatePending}>Save</button>
                        <button className="button-secondary button-inline" type="button" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    officer.name
                  )}
                </td>
                <td>{editingId === officer.id ? null : officer.username}</td>
                <td>{editingId === officer.id ? null : officer.email}</td>
                <td>{editingId === officer.id ? null : officer.role}</td>
                <td>{officer.isActive ? "Active" : "Inactive"}</td>
                <td>{officer.lastLoginAt ? formatDateTime(officer.lastLoginAt) : "Never"}</td>
                <td>{formatDateTime(officer.createdAt)}</td>
                <td>
                  <div className="manager-actions">
                    <button className="button-secondary button-inline" type="button" onClick={() => setEditingId(officer.id)}>Edit</button>
                    <button className="button-secondary button-inline" type="button" onClick={() => setPasswordResetId(officer.id)}>Reset Password</button>
                    <form action={toggleAction}>
                      <input type="hidden" name="id" value={officer.id} />
                      <input type="hidden" name="isActive" value={officer.isActive ? "false" : "true"} />
                      <button className="button-secondary button-inline" type="submit" disabled={togglePending}>
                        {officer.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </div>
                  {passwordResetId === officer.id ? (
                    <form action={passwordAction} className="manager-edit-form" style={{ marginTop: "0.5rem" }}>
                      <input type="hidden" name="id" value={officer.id} />
                      <input type="password" name="password" placeholder="New password" minLength={8} required />
                      <button className="button-secondary button-inline" type="submit" disabled={passwordPending}>Save</button>
                      <button className="button-secondary button-inline" type="button" onClick={() => setPasswordResetId(null)}>Cancel</button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
