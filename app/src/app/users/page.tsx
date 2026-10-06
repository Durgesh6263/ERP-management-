import { inviteUserAction, updateUserAccountAction } from "@/lib/users/actions";
import { requireAuthContext, requirePermission } from "@/lib/auth/context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const statusOptions = ["ACTIVE", "INACTIVE", "PENDING", "SUSPENDED"] as const;

const messages: Record<string, string> = {
  invite_sent: "Invitation sent.",
  account_updated: "Account access updated.",
  invalid_input: "Check the name, email, role, and status values.",
  auth_unconfigured: "Supabase auth or the server admin key is not configured.",
  invalid_role: "Select a role from this business.",
  role_not_allowed: "Your role cannot assign or change that access level.",
  email_in_use: "An account already exists for that email.",
  invite_failed: "The invitation could not be sent.",
  provision_failed: "The account could not be provisioned. Review the pending invitation in Supabase Auth.",
  cannot_change_self: "You cannot change your own role or status here.",
  user_not_found: "That account is not available in this business.",
  update_failed: "The account update failed. No update was saved.",
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const context = await requireAuthContext();
  await requirePermission(context, "users.manage");
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return <p className="text-sm text-[var(--signal)]">Supabase is not configured.</p>;
  }

  const [usersResult, rolesResult, assignmentsResult] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, email, status, created_at")
      .eq("business_id", context.user.business_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("roles")
      .select("id, name")
      .eq("business_id", context.user.business_id)
      .order("name"),
    supabase
      .from("user_roles")
      .select("user_id, role_id")
      .eq("business_id", context.user.business_id),
  ]);

  if (usersResult.error || rolesResult.error || assignmentsResult.error) {
    return <p className="text-sm text-[var(--signal)]">User access data could not be loaded.</p>;
  }

  const users = (usersResult.data ?? []) as UserRow[];
  const roles = (rolesResult.data ?? []) as { id: string; name: string }[];
  const assignments = (assignmentsResult.data ?? []) as { user_id: string; role_id: string }[];
  const roleByUser = new Map(assignments.map((assignment) => [assignment.user_id, assignment.role_id]));
  const message = params.notice ? messages[params.notice] : params.error ? messages[params.error] : null;
  const isError = Boolean(params.error);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--accent)]">Access control</p>
          <h1 className="mt-2 text-3xl font-semibold">Users and roles</h1>
        </div>
        <p className="text-sm text-[var(--muted)]">{users.length} account{users.length === 1 ? "" : "s"}</p>
      </div>

      {message && (
        <p className={`mt-5 border-l-2 px-3 py-2 text-sm ${isError ? "border-[var(--signal)] text-[var(--signal)]" : "border-[var(--accent)] text-[var(--accent)]"}`} role="status">
          {message}
        </p>
      )}

      <section className="mt-8 border-b border-[var(--line)] pb-8">
        <h2 className="text-lg font-semibold">Invite a user</h2>
        <form action={inviteUserAction} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1.5 text-sm font-medium">
            Name
            <input className="min-h-10 rounded-sm border border-[var(--line)] bg-white px-3 font-normal outline-none focus:border-[var(--accent)]" autoComplete="name" maxLength={120} name="name" required />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Email
            <input className="min-h-10 rounded-sm border border-[var(--line)] bg-white px-3 font-normal outline-none focus:border-[var(--accent)]" autoComplete="email" maxLength={254} name="email" required type="email" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Role
            <select className="min-h-10 rounded-sm border border-[var(--line)] bg-white px-3 font-normal outline-none focus:border-[var(--accent)]" name="roleId" required defaultValue="">
              <option value="" disabled>Select a role</option>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <button className="min-h-10 w-full rounded-sm bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]" type="submit">
              Send invitation
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Business accounts</h2>
        <div className="mt-4 overflow-x-auto border-y border-[var(--line)]">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-[#eaf0eb] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-3 py-3 font-semibold">User</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Role</th>
                <th className="px-3 py-3 font-semibold">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {users.map((user) => (
                <tr key={user.id} className="bg-white align-middle">
                  <td className="px-3 py-3">
                    <p className="font-medium">{user.name}</p>
                    <p className="mt-0.5 break-all text-xs text-[var(--muted)]">{user.email}</p>
                  </td>
                  <td className="px-3 py-3 text-xs font-semibold">{user.status}</td>
                  <td className="px-3 py-3 text-[var(--muted)]">
                    {roles.find((role) => role.id === roleByUser.get(user.id))?.name ?? "Unassigned"}
                  </td>
                  <td className="px-3 py-3">
                    {user.id === context.user.id ? (
                      <span className="text-xs text-[var(--muted)]">Current account</span>
                    ) : (
                      <form action={updateUserAccountAction} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={user.id} />
                        <label className="sr-only" htmlFor={`role-${user.id}`}>Role for {user.name}</label>
                        <select className="min-h-9 max-w-36 rounded-sm border border-[var(--line)] bg-white px-2 text-xs" id={`role-${user.id}`} name="roleId" defaultValue={roleByUser.get(user.id) ?? ""} required>
                          {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                        </select>
                        <label className="sr-only" htmlFor={`status-${user.id}`}>Status for {user.name}</label>
                        <select className="min-h-9 rounded-sm border border-[var(--line)] bg-white px-2 text-xs" id={`status-${user.id}`} name="status" defaultValue={user.status}>
                          {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                        <button className="min-h-9 rounded-sm border border-[var(--line)] px-3 text-xs font-semibold hover:bg-[var(--background)]" type="submit">
                          Save
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td className="px-3 py-8 text-center text-[var(--muted)]" colSpan={4}>No accounts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}