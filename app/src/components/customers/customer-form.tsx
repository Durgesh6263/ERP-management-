"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveCustomerAction } from "@/lib/customers/actions";
import type { CustomerFormValues } from "@/types/customer";

const inputClass = "min-h-10 w-full rounded-sm border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--accent)]";
const labelClass = "grid gap-1.5 text-sm font-medium";

const errors: Record<string, string> = {
  auth_unconfigured: "Supabase is not configured for this environment.",
  invalid_name: "Enter a name of 1 to 160 characters.",
  invalid_company: "Company name must be 160 characters or fewer.",
  invalid_phone: "Phone must be 40 characters or fewer.",
  invalid_email: "Enter a valid email address, or leave it blank.",
  invalid_gst: "GST number must be 32 characters or fewer.",
  invalid_payment_terms: "Payment terms must be 100 characters or fewer.",
  invalid_credit_limit: "Credit limit must be non-negative with up to two decimal places.",
  invalid_address: "Address must be 2,000 characters or fewer.",
  invalid_location: "City and state must be 120 characters or fewer.",
  invalid_postal_code: "Postal code must be 20 characters or fewer.",
  customer_not_found: "That customer is not available in this business.",
  forbidden: "You do not have permission to change this customer.",
  customer_save_failed: "Customer details could not be saved. Check the values and try again.",
};

export default function CustomerForm({
  customerId,
  initialValues,
}: {
  customerId?: string;
  initialValues: CustomerFormValues;
}) {
  const [state, formAction, pending] = useActionState(saveCustomerAction, {});
  const [values, setValues] = useState(initialValues);

  function field(name: keyof CustomerFormValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  return (
    <form action={formAction} className="space-y-9">
      {customerId && <input type="hidden" name="customer_id" value={customerId} />}
      {values.address_id && <input type="hidden" name="address_id" value={values.address_id} />}
      {state.error && (
        <p className="border-l-2 border-[var(--signal)] bg-[#fbf0ec] px-3 py-2 text-sm text-[var(--signal)]" role="alert">
          {errors[state.error] ?? "Customer details could not be saved."}
        </p>
      )}

      <fieldset className="grid gap-5 border-t border-[var(--line)] pt-5 md:grid-cols-2">
        <legend className="px-1 text-lg font-semibold">Basic information</legend>
        <label className={labelClass}>
          Customer name <span className="text-[var(--signal)]">*</span>
          <input className={inputClass} autoComplete="name" maxLength={160} name="name" onChange={(event) => field("name", event.target.value)} required value={values.name} />
        </label>
        <label className={labelClass}>
          Company name
          <input className={inputClass} autoComplete="organization" maxLength={160} name="company_name" onChange={(event) => field("company_name", event.target.value)} value={values.company_name} />
        </label>
        <label className={labelClass}>
          Phone
          <input className={inputClass} autoComplete="tel" maxLength={40} name="phone" onChange={(event) => field("phone", event.target.value)} type="tel" value={values.phone} />
        </label>
        <label className={labelClass}>
          Email
          <input className={inputClass} autoComplete="email" maxLength={254} name="email" onChange={(event) => field("email", event.target.value)} type="email" value={values.email} />
        </label>
        <label className={labelClass}>
          GST number
          <input className={inputClass} maxLength={32} name="gst_number" onChange={(event) => field("gst_number", event.target.value)} value={values.gst_number} />
        </label>
        <label className={labelClass}>
          Payment terms
          <input className={inputClass} maxLength={100} name="payment_terms" onChange={(event) => field("payment_terms", event.target.value)} placeholder="For example, Net 30" value={values.payment_terms} />
        </label>
        <label className={labelClass}>
          Credit limit
          <input className={inputClass} inputMode="decimal" max="999999999999.99" min="0" name="credit_limit" onChange={(event) => field("credit_limit", event.target.value)} required step="0.01" type="number" value={values.credit_limit} />
        </label>
      </fieldset>

      <fieldset className="grid gap-5 border-t border-[var(--line)] pt-5 md:grid-cols-2">
        <legend className="px-1 text-lg font-semibold">Address</legend>
        <label className={`${labelClass} md:col-span-2`}>
          Street address
          <textarea className={`${inputClass} min-h-24 py-2`} maxLength={2000} name="address" onChange={(event) => field("address", event.target.value)} value={values.address} />
        </label>
        <label className={labelClass}>
          City
          <input className={inputClass} autoComplete="address-level2" maxLength={120} name="city" onChange={(event) => field("city", event.target.value)} value={values.city} />
        </label>
        <label className={labelClass}>
          State
          <input className={inputClass} autoComplete="address-level1" maxLength={120} name="state" onChange={(event) => field("state", event.target.value)} value={values.state} />
        </label>
        <label className={labelClass}>
          Postal code
          <input className={inputClass} autoComplete="postal-code" maxLength={20} name="postal_code" onChange={(event) => field("postal_code", event.target.value)} value={values.postal_code} />
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-5">
        <button className="min-h-10 rounded-sm bg-[var(--accent)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Saving..." : customerId ? "Save changes" : "Create customer"}
        </button>
        <Link className="rounded-sm px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:bg-[#eaf0eb]" href={customerId ? `/customers/${customerId}` : "/customers"}>
          Cancel
        </Link>
      </div>
    </form>
  );
}