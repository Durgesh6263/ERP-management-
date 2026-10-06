"use client";

import { useActionState } from "react";
import { addRawMaterialStockManualAction } from "@/lib/purchases/actions";
import { MANUAL_STOCK_REASONS } from "@/types/supplier";

interface ManualStockFormProps {
  materials: { id: string; code: string | null; name: string; unit: string; current_stock: string | number }[];
}

interface ManualStockFormState {
  error?: string;
}

export function ManualStockForm({ materials }: ManualStockFormProps) {
  const [state, formAction] = useActionState(
    async (prevState: ManualStockFormState, formData: FormData): Promise<ManualStockFormState> => {
      await addRawMaterialStockManualAction(formData);
      return prevState;
    },
    { error: undefined }
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="raw_material_id" className="block text-sm font-medium text-gray-700 mb-1">
            Raw Material <span className="text-red-500">*</span>
          </label>
          <select
            id="raw_material_id"
            name="raw_material_id"
            required
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
          >
            <option value="">Select Material</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code ? `${m.code} - ` : ""}{m.name} ({m.unit}) — Current: {Number(m.current_stock).toFixed(3)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
            Quantity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            required
            step="0.001"
            min="0.001"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
          />
        </div>

        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
            Reason <span className="text-red-500">*</span>
          </label>
          <select
            id="reason"
            name="reason"
            required
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
          >
            <option value="">Select Reason</option>
            {MANUAL_STOCK_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-1">
            Reference (Optional)
          </label>
          <input
            type="text"
            id="reference"
            name="reference"
            maxLength={100}
            placeholder="e.g., PO-001, INV-123"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            name="notes"
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

      <div className="flex gap-3 pt-4 border-t">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-10"
        >
          Add Stock
        </button>
        <a
          href="/inventory"
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-10"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}