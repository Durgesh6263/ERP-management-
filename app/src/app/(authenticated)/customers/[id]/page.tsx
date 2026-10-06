import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ConfirmSubmit from "@/components/confirm-submit";
import { getAuthContext } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions/authorization";
import { setCustomerStatusAction } from "@/lib/customers/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Customer, CustomerAddress } from "@/types/customer";

export const dynamic = "force-dynamic";

const notices: Record<string, string> = {
  customer_created: "Customer created.",
  customer_updated: "Customer updated.",
  customer_deactivated: "Customer deactivated. Existing references remain intact.",
  customer_activated: "Customer activated.",
};

export default async function CustomerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const context = await getAuthContext();
  if (!context) redirect("/login?error=account_unavailable");
  if (!hasPermission({ permissions: context.permissions }, "customers.view")) redirect("/");
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <p className="text-sm text-[var(--signal)]">Supabase is not configured.</p>;

  const [{ data: customerData, error: customerError }, { data: addressData, error: addressError }] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .eq("business_id", context.user.business_id)
      .maybeSingle(),
    supabase
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", id)
      .order("created_at"),
  ]);
  if (customerError || !customerData) notFound();
  if (addressError) return <p className="text-sm text-[var(--signal)]">Customer addresses could not be loaded.</p>;

  const customer = customerData as Customer;
  const addresses = (addressData ?? []) as CustomerAddress[];
  const canEdit = hasPermission({ permissions: context.permissions }, "customers.edit");
  const canDeactivate = hasPermission({ permissions: context.permissions }, "customers.delete");
  const paramsValue = await searchParams;
  const notice = paramsValue.notice ? notices[paramsValue.notice] : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <Link className="text-sm font-medium text-[var(--accent)] hover:underline" href="/customers">Customers</Link>
          <h1 className="mt-2 text-3xl font-semibold">{customer.name}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{customer.company_name || "Individual customer"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`border px-2.5 py-1.5 text-xs font-semibold ${customer.status === "ACTIVE" ? "border-[#b8d7c7] bg-[#eef5f0] text-[var(--accent-strong)]" : "border-[#e6c5b9] bg-[#fbf0ec] text-[var(--signal)]"}`}>
            {customer.status === "ACTIVE" ? "Active" : "Inactive"}
          </span>
          {canEdit && <Link className="rounded-sm bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]" href={`/customers/${customer.id}/edit`}>Edit customer</Link>}
          {customer.status === "ACTIVE" && canDeactivate && (
            <ConfirmSubmit
              action={setCustomerStatusAction}
              fieldName="customer_id"
              fieldValue={customer.id}
              hiddenFields={{ status: "INACTIVE" }}
              label="Deactivate"
              confirmation={`Deactivate ${customer.name}? Customer history and references will be retained.`}
              className="rounded-sm border border-[var(--line)] px-3 py-2 text-sm font-medium hover:bg-white"
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
              className="rounded-sm border border-[var(--line)] px-3 py-2 text-sm font-medium hover:bg-white"
            />
          )}
        </div>
      </div>

      {notice && <p className="mt-5 border-l-2 border-[var(--accent)] bg-[#eef5f0] px-3 py-2 text-sm text-[var(--accent-strong)]" role="status">{notice}</p>}

      <section className="mt-8 border-b border-[var(--line)] pb-8">
        <h2 className="text-lg font-semibold">Basic information</h2>
        <dl className="mt-5 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="text-xs font-semibold uppercase text-[var(--muted)]">Name</dt><dd className="mt-1 text-sm font-medium">{customer.name}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-[var(--muted)]">Company</dt><dd className="mt-1 text-sm">{customer.company_name || "-"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-[var(--muted)]">Phone</dt><dd className="mt-1 text-sm">{customer.phone || "-"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-[var(--muted)]">Email</dt><dd className="mt-1 break-all text-sm">{customer.email || "-"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-[var(--muted)]">GST number</dt><dd className="mt-1 text-sm">{customer.gst_number || "-"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-[var(--muted)]">Payment terms</dt><dd className="mt-1 text-sm">{customer.payment_terms || "-"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase text-[var(--muted)]">Credit limit</dt><dd className="mt-1 text-sm tabular-nums">{customer.credit_limit}</dd></div>
        </dl>
      </section>

      <section className="mt-8 border-b border-[var(--line)] pb-8">
        <h2 className="text-lg font-semibold">Addresses</h2>
        {addresses.length > 0 ? (
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {addresses.map((address) => (
              <address className="not-italic text-sm leading-6 text-[var(--muted)]" key={address.id}>
                <p className="font-semibold text-[var(--foreground)]">{address.address_type}</p>
                {address.address && <p>{address.address}</p>}
                <p>{[address.city, address.state, address.postal_code].filter(Boolean).join(", ") || "-"}</p>
              </address>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-[var(--muted)]">No address on file.</p>}
      </section>

      <section className="mt-8 border-b border-[var(--line)] pb-8">
        <h2 className="text-lg font-semibold">Business summary</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">These values are not calculated until Orders and Payments are implemented.</p>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[["Total orders", "Not calculated"], ["Total sales", "Not calculated"], ["Total received", "Not calculated"], ["Total due", "Not calculated"]].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase text-[var(--muted)]">{label}</dt>
              <dd className="mt-1 text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">History</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          {[["Orders", "Order history will appear when Orders is implemented."], ["Payments", "Payment history will appear when Payments is implemented."], ["Ledger", "Customer ledger will appear when its module is implemented."]].map(([title, description]) => (
            <div className="border-t border-[var(--line)] pt-3" key={title}>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}