import { notFound, redirect } from "next/navigation";
import CustomerForm from "@/components/customers/customer-form";
import { getAuthContext } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions/authorization";
import { customerToFormValues } from "@/lib/customers/form-values";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Customer, CustomerAddress } from "@/types/customer";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await getAuthContext();
  if (!context) redirect("/login?error=account_unavailable");
  if (!hasPermission({ permissions: context.permissions }, "customers.view")) redirect("/");
  if (!hasPermission({ permissions: context.permissions }, "customers.edit")) redirect("/customers");
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
      .order("created_at")
      .limit(1)
      .maybeSingle(),
  ]);
  if (customerError || !customerData) notFound();
  if (addressError) return <p className="text-sm text-[var(--signal)]">Customer address could not be loaded.</p>;

  return (
    <div>
      <div className="mb-8 border-b border-[var(--line)] pb-5">
        <p className="text-xs font-semibold uppercase text-[var(--accent)]">Customer record</p>
        <h1 className="mt-2 text-3xl font-semibold">Edit {customerData.name}</h1>
      </div>
      <CustomerForm
        customerId={id}
        initialValues={customerToFormValues(customerData as Customer, addressData as CustomerAddress | undefined)}
      />
    </div>
  );
}