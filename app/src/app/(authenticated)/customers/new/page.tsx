import { redirect } from "next/navigation";
import CustomerForm from "@/components/customers/customer-form";
import { getAuthContext } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions/authorization";
import { EMPTY_CUSTOMER_FORM_VALUES } from "@/lib/customers/form-values";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login?error=account_unavailable");
  if (!hasPermission({ permissions: context.permissions }, "customers.view")) redirect("/");
  if (!hasPermission({ permissions: context.permissions }, "customers.create")) redirect("/customers");

  return (
    <div>
      <div className="mb-8 border-b border-[var(--line)] pb-5">
        <p className="text-xs font-semibold uppercase text-[var(--accent)]">Customer record</p>
        <h1 className="mt-2 text-3xl font-semibold">New customer</h1>
      </div>
      <CustomerForm initialValues={EMPTY_CUSTOMER_FORM_VALUES} />
    </div>
  );
}