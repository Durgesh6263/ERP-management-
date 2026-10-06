"use client";

import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { createPurchaseOrderAction } from "@/lib/purchases/actions";

interface PoFormProps {
  suppliers: { id: string; name: string }[];
  materials: { id: string; code: string | null; name: string; unit: string }[];
}

export function PoForm({ suppliers, materials }: PoFormProps) {
  const [items, setItems] = useState<Array<{
    raw_material_id: string;
    ordered_quantity: string;
    unit_cost: string;
    tax_rate: string;
  }>>([{ raw_material_id: "", ordered_quantity: "", unit_cost: "", tax_rate: "0" }]);

  const [state, formAction] = useActionState(createPurchaseOrderAction, { error: undefined });

  const addItem = () => {
    setItems([...items, { raw_material_id: "", ordered_quantity: "", unit_cost: "", tax_rate: "0" }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    formData.set("items", JSON.stringify(items));
    formAction(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="supplier_id" className="block text-sm font-medium text-gray-700 mb-1">
            Supplier <span className="text-red-500">*</span>
          </label>
          <select
            id="supplier_id"
            name="supplier_id"
            required
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
          >
            <option value="">Select Supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="po_number" className="block text-sm font-medium text-gray-700 mb-1">
            PO Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="po_number"
            name="po_number"
            required
            maxLength={64}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
            placeholder="PO-001"
          />
        </div>

        <div>
          <label htmlFor="order_date" className="block text-sm font-medium text-gray-700 mb-1">
            Order Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="order_date"
            name="order_date"
            required
            defaultValue={new Date().toISOString().split("T")[0]}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
          />
        </div>

        <div>
          <label htmlFor="expected_date" className="block text-sm font-medium text-gray-700 mb-1">
            Expected Date
          </label>
          <input
            type="date"
            id="expected_date"
            name="expected_date"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            maxLength={1000}
            rows={2}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
          />
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Items</h3>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-200 min-h-9"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200" role="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Line Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-3">
                    <select
                      name={`items[${index}][raw_material_id]`}
                      value={item.raw_material_id}
                      onChange={(e) => updateItem(index, "raw_material_id", e.target.value)}
                      required
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
                    >
                      <option value="">Select Material</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.code ? `${m.code} - ` : ""}{m.name} ({m.unit})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      name={`items[${index}][ordered_quantity]`}
                      value={item.ordered_quantity}
                      onChange={(e) => updateItem(index, "ordered_quantity", e.target.value)}
                      required
                      step="0.001"
                      min="0.001"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      name={`items[${index}][unit_cost]`}
                      value={item.unit_cost}
                      onChange={(e) => updateItem(index, "unit_cost", e.target.value)}
                      required
                      step="0.01"
                      min="0"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      name={`items[${index}][tax_rate]`}
                      value={item.tax_rate}
                      onChange={(e) => updateItem(index, "tax_rate", e.target.value)}
                      required
                      step="0.01"
                      min="0"
                      max="100"
                      defaultValue="0"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {(() => {
                      const qty = Number(item.ordered_quantity) || 0;
                      const cost = Number(item.unit_cost) || 0;
                      const tax = Number(item.tax_rate) || 0;
                      return (qty * cost * (1 + tax / 100)).toFixed(2);
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-900 min-h-9 min-w-9 p-1"
                        aria-label="Remove item"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {items.length === 0 && (
          <p className="text-center text-gray-500 py-8">No items added yet. Click &ldquo;Add Item&rdquo; to start.</p>
        )}
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
          Create Purchase Order
        </button>
        <Link
          href="/purchases"
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-10"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}