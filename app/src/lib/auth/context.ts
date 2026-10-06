import { redirect } from "next/navigation";
import type { AppRole, AppUser, BusinessStatus } from "@/types/business";
import { hasPermission } from "@/lib/permissions/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthContext = {
  authUserId: string;
  user: AppUser;
  role: AppRole | null;
  roleKey: string | null;
  permissions: string[];
};

export function normalizeRoleKey(name: string): string {
  return name.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const { data: profileData, error: profileError } = await supabase
    .from("users")
    .select("id, business_id, auth_user_id, name, email, phone, status, created_at, updated_at")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (profileError || !profileData) return null;

  const profile = profileData as AppUser;
  const { data: businessData, error: businessError } = await supabase
    .from("businesses")
    .select("status")
    .eq("id", profile.business_id)
    .maybeSingle();

  if (
    businessError ||
    profile.status !== "ACTIVE" ||
    (businessData as { status?: BusinessStatus } | null)?.status !== "ACTIVE"
  ) {
    return null;
  }

  const { data: assignmentData, error: assignmentError } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", profile.id)
    .maybeSingle();

  const roleId = (assignmentData as { role_id?: string } | null)?.role_id;
  if (assignmentError || !roleId) return null;

  const { data: roleData, error: roleError } = await supabase
    .from("roles")
    .select("id, business_id, name, description, created_at, updated_at")
    .eq("id", roleId)
    .eq("business_id", profile.business_id)
    .maybeSingle();

  if (roleError || !roleData) return null;

  const role = roleData as AppRole;
  let permissions: string[] = [];

  const { data: rolePermissionData, error: rolePermissionError } = await supabase
    .from("role_permissions")
    .select("permission_id")
    .eq("role_id", role.id);
  if (rolePermissionError) return null;

  const rolePermissionIds = (rolePermissionData ?? []).map(
    (entry) => (entry as { permission_id: string }).permission_id,
  );
  if (rolePermissionIds.length > 0) {
    const { data: permissionData, error: permissionError } = await supabase
      .from("permissions")
      .select("module, action")
      .in("id", rolePermissionIds);
    if (permissionError) return null;
    permissions = (permissionData ?? []).map((entry) => {
      const permission = entry as { module: string; action: string };
      return `${permission.module}.${permission.action}`;
    });
  }

  const { data: userPermissionData, error: userPermissionError } = await supabase
    .from("user_permissions")
    .select("allowed, permission:permissions(module, action)")
    .eq("user_id", profile.id);
  if (userPermissionError) return null;

  for (const entry of userPermissionData ?? []) {
    const override = entry as {
      allowed: boolean;
      permission:
        | { module: string; action: string }
        | { module: string; action: string }[]
        | null;
    };
    const permission = Array.isArray(override.permission)
      ? override.permission[0]
      : override.permission;
    if (!permission) continue;
    const key = `${permission.module}.${permission.action}`;
    permissions = permissions.filter((permission) => permission !== key);
    if (override.allowed) permissions.push(key);
  }

  return {
    authUserId: authData.user.id,
    user: profile,
    role,
    roleKey: role ? normalizeRoleKey(role.name) : null,
    permissions: [...new Set(permissions)],
  };
}

export async function requireAuthContext(): Promise<AuthContext> {
  const context = await getAuthContext();
  if (context) return context;

  const supabase = await createServerSupabaseClient();
  await supabase?.auth.signOut();
  redirect("/login?error=account_unavailable");
}

export async function requirePermission(
  context: AuthContext,
  permission: string,
): Promise<void> {
  if (!hasPermission({ permissions: context.permissions }, permission)) {
    redirect("/");
  }
}