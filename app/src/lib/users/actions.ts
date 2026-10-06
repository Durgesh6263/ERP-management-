"use server";

import { redirect } from "next/navigation";
import { getAuthContext, normalizeRoleKey } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logUserInvited, logUserAccountUpdated } from "@/lib/audit";

const ROLE_RANK: Record<string, number> = {
  manager: 1,
  admin: 2,
  super_admin: 3,
};

const USER_STATUSES = ["ACTIVE", "INACTIVE", "PENDING", "SUSPENDED"] as const;
type ManagedUserStatus = (typeof USER_STATUSES)[number];

function fail(code: string): never {
  redirect(`/users?error=${encodeURIComponent(code)}`);
}

async function requireUserManager() {
  const context = await getAuthContext();
  if (!context) redirect("/login?error=account_unavailable");
  if (!hasPermission({ permissions: context.permissions }, "users.manage")) {
    redirect("/");
  }
  return context;
}

function canManageRole(actorRole: string | null, targetRole: string): boolean {
  const actorRank = actorRole ? ROLE_RANK[actorRole] : undefined;
  const targetRank = ROLE_RANK[targetRole];
  return actorRank !== undefined && targetRank !== undefined && targetRank <= actorRank;
}

function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getSiteUrl(path: string): string {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${origin}${path}`;
}

export async function inviteUserAction(formData: FormData): Promise<never> {
  const context = await requireUserManager();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleId = String(formData.get("roleId") ?? "");

  if (!name || name.length > 120 || !isEmailValid(email) || email.length > 254 || !roleId) {
    fail("invalid_input");
  }

  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  if (!supabase || !admin) fail("auth_unconfigured");

  const { data: roleData, error: roleError } = await supabase
    .from("roles")
    .select("id, name")
    .eq("id", roleId)
    .eq("business_id", context.user.business_id)
    .maybeSingle();
  if (roleError || !roleData) fail("invalid_role");

  const targetRoleKey = normalizeRoleKey((roleData as { name: string }).name);
  if (!canManageRole(context.roleKey, targetRoleKey)) fail("role_not_allowed");

  const { data: existingUser } = await admin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingUser) fail("email_in_use");

  const { data: invitation, error: invitationError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: { name },
      redirectTo: getSiteUrl("/auth/callback?next=/reset-password"),
    });

  if (invitationError || !invitation.user) fail("invite_failed");

  const { error: provisionError } = await admin.rpc("provision_user_account", {
    target_business_id: context.user.business_id,
    target_auth_user_id: invitation.user.id,
    target_name: name,
    target_email: email,
    target_role_id: roleId,
    actor_user_id: context.user.id,
  });

  if (provisionError) fail("provision_failed");

  // Audit log the invitation
  await logUserInvited(context, invitation.user.id, { name, email, roleId });

  redirect("/users?notice=invite_sent");
}

export async function updateUserAccountAction(formData: FormData): Promise<never> {
  const context = await requireUserManager();
  const userId = String(formData.get("userId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!userId || !roleId || !USER_STATUSES.includes(status as ManagedUserStatus)) {
    fail("invalid_input");
  }
  if (userId === context.user.id) fail("cannot_change_self");

  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  if (!supabase || !admin) fail("auth_unconfigured");

  const { data: roleData, error: roleError } = await supabase
    .from("roles")
    .select("id, name")
    .eq("id", roleId)
    .eq("business_id", context.user.business_id)
    .maybeSingle();
  if (roleError || !roleData) fail("invalid_role");

  const targetRoleKey = normalizeRoleKey((roleData as { name: string }).name);
  if (!canManageRole(context.roleKey, targetRoleKey)) fail("role_not_allowed");

  const { data: targetUser, error: targetError } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .eq("business_id", context.user.business_id)
    .maybeSingle();
  if (targetError || !targetUser) fail("user_not_found");

  const { data: currentAssignment } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId)
    .maybeSingle();
  const currentRoleId = (currentAssignment as { role_id?: string } | null)?.role_id;

  if (currentRoleId) {
    const { data: currentRole } = await supabase
      .from("roles")
      .select("name")
      .eq("id", currentRoleId)
      .eq("business_id", context.user.business_id)
      .maybeSingle();
    const currentRoleKey = currentRole
      ? normalizeRoleKey((currentRole as { name: string }).name)
      : null;
    if (currentRoleKey && !canManageRole(context.roleKey, currentRoleKey)) {
      fail("role_not_allowed");
    }
  }

  const { data: currentUser } = await supabase
    .from("users")
    .select("status")
    .eq("id", userId)
    .maybeSingle();
  const currentStatus = (currentUser as { status?: string } | null)?.status ?? "ACTIVE";

  const { error } = await admin.rpc("update_managed_user_account", {
    target_user_id: userId,
    target_role_id: roleId,
    target_status: status,
    actor_user_id: context.user.id,
  });

  if (error) fail("update_failed");

  // Audit log the account update
  await logUserAccountUpdated(context, userId,
    { status: currentStatus, roleId: currentRoleId ?? null },
    { status: status, roleId: roleId }
  );

  redirect("/users?notice=account_updated");
}