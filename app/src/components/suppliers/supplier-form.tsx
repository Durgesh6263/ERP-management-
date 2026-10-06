"use client";

import { useActionState } from "react";
import { saveSupplierAction } from "@/lib/suppliers/actions";

interface SupplierFormProps {
  initialData?: {
    name: string;
    phone: string;
    email: string;
    address: string;
    gst_number: string;
  };
  supplierId?: string;
}

export function SupplierForm({ initialData, supplierId }: SupplierFormProps) {
  const [state, formAction] = useActionState(saveSupplierAction, { error: undefined });

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="supplier_id" value={supplierId ?? ""} />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            defaultValue={initialData?.name ?? ""}
            required
            maxLength={160}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            defaultValue={initialData?.phone ?? ""}
            maxLength={40}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            defaultValue={initialData?.email ?? ""}
            maxLength={254}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
          />
        </div>

        <div>
          <label htmlFor="gst_number" className="block text-sm font-medium text-gray-700 mb-1">
            GST Number
          </label>
          <input
            type="text"
            id="gst_number"
            name="gst_number"
            defaultValue={initialData?.gst_number ?? ""}
            maxLength={32}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <textarea
            id="address"
            name="address"
            defaultValue={initialData?.address ?? ""}
            maxLength={500}
            rows={3}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
          />
        </div>
      </div>

      {state.error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Error: {state.error}
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-10"
        >
          {supplierId ? "Update Supplier" : "Create Supplier"}
        </button>
        <a
          href={supplierId ? `/suppliers/${supplierId}` : "/suppliers"}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-10"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}