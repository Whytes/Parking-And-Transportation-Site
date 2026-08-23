import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { permissionMap, type Role } from "@/lib/permissions";

export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

export async function requirePermission(permission: string) {
  const session = await requireAuth();
  const role = session.user.role;

  if (!permissionMap[role].includes(permission)) {
    redirect("/citations");
  }

  return session;
}

export function can(role: Role, permission: string) {
  return permissionMap[role].includes(permission);
}
