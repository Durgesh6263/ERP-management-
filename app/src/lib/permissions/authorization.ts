import type { PermissionName } from "@/lib/permissions/catalog";

export type PermissionSubject = {
  permissions?: string[] | null;
  role_permissions?: string[] | null;
};

export function hasPermission(
  user: PermissionSubject | null | undefined,
  permission: PermissionName | string,
): boolean {
  const permissionSet = new Set<string>();

  const rawPermissions = [
    ...(user?.permissions ?? []),
    ...(user?.role_permissions ?? []),
  ];

  rawPermissions.forEach((entry) => {
    if (!entry) {
      return;
    }

    permissionSet.add(entry.trim());
  });

  return permissionSet.has(permission.trim());
}
