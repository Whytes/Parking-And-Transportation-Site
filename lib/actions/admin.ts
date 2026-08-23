"use server";

import { hash } from "bcryptjs";
import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { users, vehicleNotes } from "@/db/schema";
import { requirePermission } from "@/lib/authz";

export type OfficerActionState = {
  error?: string;
  success?: string;
};

export type VehicleNoteActionState = {
  error?: string;
  success?: string;
  note?: {
    plateState: string;
    plateNumber: string;
    note: string;
    updatedByName: string;
    updatedAt: string;
  } | null;
};

function refreshAdminViews() {
  revalidatePath("/officers");
}

function refreshVehicleViews() {
  revalidatePath("/citations");
  revalidatePath("/plates");
}

export async function createOfficerAction(_: OfficerActionState, formData: FormData): Promise<OfficerActionState> {
  await requirePermission("officers");
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "officer") as "admin" | "officer";
  const password = String(formData.get("password") ?? "");

  if (!name || !username || !email || !password) {
    return { error: "Name, username, email, and password are required." };
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.username, username), eq(users.email, email)))
    .limit(1);

  if (existing[0]) {
    return { error: "That username or email already exists." };
  }

  await db.insert(users).values({
    name,
    username,
    email,
    passwordHash: await hash(password, 12),
    role,
    isActive: true,
    updatedAt: new Date()
  });

  refreshAdminViews();
  return { success: "Officer created." };
}

export async function updateOfficerAction(_: OfficerActionState, formData: FormData): Promise<OfficerActionState> {
  await requirePermission("officers");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "officer") as "admin" | "officer";

  if (!id || !name || !username || !email) {
    return { error: "Name, username, and email are required." };
  }

  await db.update(users).set({ name, username, email, role, updatedAt: new Date() }).where(eq(users.id, id));
  refreshAdminViews();
  return { success: "Officer updated." };
}

export async function resetOfficerPasswordAction(_: OfficerActionState, formData: FormData): Promise<OfficerActionState> {
  await requirePermission("officers");
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!id || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  await db.update(users).set({ passwordHash: await hash(password, 12), updatedAt: new Date() }).where(eq(users.id, id));
  refreshAdminViews();
  return { success: "Password reset." };
}

export async function toggleOfficerActiveAction(_: OfficerActionState, formData: FormData): Promise<OfficerActionState> {
  await requirePermission("officers");
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("isActive") ?? "") === "true";

  if (!id) {
    return { error: "Invalid officer id." };
  }

  await db.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, id));
  refreshAdminViews();
  return { success: isActive ? "Officer activated." : "Officer deactivated." };
}

export async function saveVehicleNoteAction(_: VehicleNoteActionState, formData: FormData): Promise<VehicleNoteActionState> {
  const session = await requirePermission("citations");
  const plateState = String(formData.get("plateState") ?? "").trim().toUpperCase();
  const plateNumber = String(formData.get("plateNumber") ?? "").trim().toUpperCase();
  const note = String(formData.get("note") ?? "").trim();

  if (!plateState || !plateNumber) {
    return { error: "Plate state and plate number are required." };
  }

  const [existing] = await db
    .select({ id: vehicleNotes.id })
    .from(vehicleNotes)
    .where(and(eq(vehicleNotes.plateState, plateState), eq(vehicleNotes.plateNumber, plateNumber)))
    .limit(1);

  if (!note) {
    if (existing) {
      await db.delete(vehicleNotes).where(eq(vehicleNotes.id, existing.id));
    }
    refreshVehicleViews();
    return { success: "Vehicle note cleared.", note: null };
  }

  if (existing) {
    await db
      .update(vehicleNotes)
      .set({ note, updatedByUserId: session.user.id, updatedAt: new Date() })
      .where(eq(vehicleNotes.id, existing.id));
  } else {
    await db.insert(vehicleNotes).values({
      plateState,
      plateNumber,
      note,
      updatedByUserId: session.user.id,
      updatedAt: new Date()
    });
  }

  refreshVehicleViews();
  return {
    success: "Vehicle note saved.",
    note: {
      plateState,
      plateNumber,
      note,
      updatedByName: session.user.name || session.user.email || session.user.id,
      updatedAt: new Date().toISOString()
    }
  };
}
