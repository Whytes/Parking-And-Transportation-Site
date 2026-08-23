export type Role = "admin" | "officer";

export const publicPaths = ["/login"];

export const permissions = {
  admin: ["dashboard", "citations", "plates", "statistics", "records:create", "records:edit", "records:archive", "officers", "locations", "violations", "import"],
  officer: ["dashboard", "citations", "plates", "statistics", "records:create", "records:edit", "records:archive", "locations", "violations"]
} as const;

export type PermissionMap = Record<Role, readonly string[]>;

export const permissionMap: PermissionMap = permissions;
