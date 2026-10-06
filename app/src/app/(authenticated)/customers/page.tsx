import Link from "next/link";
import ConfirmSubmit from "@/components/confirm-submit";
import { requireAuthContext, requirePermission } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions/authorization";
import { setCustomerStatusAction } from "@/lib/customers/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Customer } from "@/types/customer";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const messages: Record<string, string> = {
  customer_created: "Customer created.",
  customer_updated: "Customer updated.",
  customer_deactivated: "Customer deactivated. Existing records and references remain intact.",
  customer_activated: "Customer activated.",
  customer_status_failed: "Customer status could not be changed.",
  customer_not_found: "That customer is not available in this business.",
  forbidden: "You do not have permission to manage customers.",
  auth_unconfigured: "Supabase is not configured for this environment.",
};

function safeSearch(value: string | undefined): string {
  return (value ?? "")
    .replace(/[^\p{L}\p{N}\s@._+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function createdDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-IN");
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
    notice?: string;
    error?: string;
  }>;
}) {
  const context = await requireAuthContext();
  await requirePermission(context, "customers.view");
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <p className="text-sm text-[var(--signal)]">Supabase is not configured.</p>;

  const search = safeSearch(params.q);
  const pageNumber = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isSafeInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const status = params.status === "ACTIVE" || params.status === "INACTIVE" ? params.status : "ALL";
  const canCreate = hasPermission({ permissions: context.permissions }, "customers.create");
  const canEdit = hasPermission({ permissions: context.permissions }, "customers.edit");
  const canDeactivate = hasPermission({ permissions: context.permissions }, "customers.delete");

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("business_id", context.user.business_id)
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,company_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,gst_number.ilike.%${search}%`,
    );
  }
  if (status !== "ALL") query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) return <p className="text-sm text-[var(--signal)]">Customers could not be loaded.</p>;

  const customers = (data ?? []) as Customer[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const message = params.notice ? messages[params.notice] : params.error ? messages[params.error] : null;
  const pageHref = (targetPage: number) => {
    const queryParams = new URLSearchParams();
    if (search) queryParams.set("q", search);
    if (status !== "ALL") queryParams.set("status", status);
    queryParams.set("page", String(targetPage));
    return `/customers?${queryParams.toString()}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--accent)]">Business records</p>
          <h1 className="mt-2 text-3xl font-semibold">Customers</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Customer contact and account information.</p>
        </div>
        {canCreate && <Link className="rounded-sm bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]" href="/customers/new">New customer</Link>}
      </div>

      {message && <p className={`mt-5 border-l-2 px-3 py-2 text-sm ${params.error ? "border-[var(--signal)] bg-[#fbf0ec] text-[var(--signal)]" : "border-[var(--accent)] bg-[#eef5f0] text-[var(--accent-strong)]"}`} role="status">{message}</p>}

      <form action="/customers" className="mt-6 grid gap-3 border-b border-[var(--line)] pb-6 sm:grid-cols-[minmax(220px,1fr)_180px_auto]">
        <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted)]">
          Search name, company, contact, or GST
          <input className="min-h-10 rounded-sm border border-[var(--line)] bg-white px-3 text-sm font-normal text-[var(--foreground)] outline-none focus:border-[var(--accent)]" maxLength={80} name="q" defaultValue={search} />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted)]">
          Status
          <select className="min-h-10 rounded-sm border border-[var(--line)] bg-white px-3 text-sm font-normal text-[var(--foreground)] outline-none focus:border-[var(--accent)]" name="status" defaultValue={status}>
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <div className="flex items-end">
          <button className="min-h-10 w-full rounded-sm border border-[var(--line)] bg-white px-4 text-sm font-semibold hover:bg-[#eaf0eb]" type="submit">Apply filters</button>
        </div>
      </form>

      <div className="mt-5 flex items-center justify-between text-sm text-[var(--muted)]">
        <p>{count ?? 0} customer{count === 1 ? "" : "s"}</p>
        <p>Page {page} of {totalPages}</p>
      </div>
      <div className="mt-3 overflow-x-auto border-y border-[var(--line)]">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead className="bg-[#eaf0eb] text-xs uppercase text-[var(--muted)]">
            <tr>
              <th className="px-3 py-3 font-semibold">Name</th>
              <th className="px-3 py-3 font-semibold">Company</th>
              <th className="px-3 py-3 font-semibold">Phone</th>
              <th className="px-3 py-3 font-semibold">Email</th>
              <th className="px-3 py-3 font-semibold">GST</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Created</th>
              <th className="px-3 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {customers.map((customer) => (
              <tr key={customer.id} className="bg-white align-middle">
                <td className="px-3 py-3"><Link className="font-semibold hover:text-[var(--accent)]" href={`/customers/${customer.id}`}>{customer.name}</Link></td>
                <td className="px-3 py-3">{customer.company_name || "-"}</td>
                <td className="px-3 py-3">{customer.phone || "-"}</td>
                <td className="px-3 py-3">{customer.email || "-"}</td>
                <td className="px-3 py-3">{customer.gst_number || "-"}</td>
                <td className="px-3 py-3">
                  <span className={`border px-2 py-1 text-xs font-semibold ${customer.status === "ACTIVE" ? "border-[#b8d7c7] bg-[#eef5f0] text-[var(--accent-strong)]" : "border-[#e6c5b9] bg-[#fbf0ec] text-[var(--signal)]"}`}>
                    {customer.status === "ACTIVE" ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-3 py-3">{createdDate(customer.created_at)}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Link className="text-xs font-semibold text-[var(--accent)] hover:underline" href={`/customers/${customer.id}`}>View</Link>
                    {canEdit && <Link className="text-xs font-semibold text-[var(--accent)] hover:underline" href={`/customers/${customer.id}/edit`}>Edit</Link>}
                    {customer.status === "ACTIVE" && canDeactivate && (
                      <ConfirmSubmit
                        action={setCustomerStatusAction}
                        fieldName="customer_id"
                        fieldValue={customer.id}
                        hiddenFields={{ status: "INACTIVE" }}
                        label="Deactivate"
                        confirmation={`Deactivate ${customer.name}? Customer history and references will be retained.`}
                        className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
                      />
                    )}
                    {customer.status === "INACTIVE" && canEdit && (
                      <ConfirmSubmit
                        action={setCustomerStatusAction}
                        fieldName="customer_id"
                        fieldValue={customer.id}
                        hiddenFields={{ status: "ACTIVE" }}
                        label="Reactivate"
                        confirmation={`Reactivate ${customer.name}?`}
                        className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td className="px-3 py-12 text-center text-[var(--muted)]" colSpan={8}>No customers match these filters.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        {page > 1 && <Link className="rounded-sm border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium" href={pageHref(page - 1)}>Previous</Link>}
        {page < totalPages && <Link className="rounded-sm border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium" href={pageHref(page + 1)}>Next</Link>}
      </div>
    </div>
  );
}