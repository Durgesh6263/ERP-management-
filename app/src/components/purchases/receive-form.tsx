"use client";

import { useState } from "react";
import { useActionState } from "react";
import { receivePurchaseOrderItemsAction } from "@/lib/purchases/actions";
import type { PurchaseOrderItemWithMaterial } from "@/types/supplier";

interface ReceiveFormProps {
  poId: string;
  items: PurchaseOrderItemWithMaterial[];
  poStatus: string;
}

interface ReceiveFormState {
  error?: string;
}

export function ReceiveForm({ poId, items, poStatus }: ReceiveFormProps) {
  const [receiveItems, setReceiveItems] = useState(
    items.map((item) => ({
      purchase_order_item_id: item.id,
      raw_material_id: item.raw_material_id,
      received_quantity: "",
      unit_cost: String(item.unit_cost),
      tax_rate: String(item.tax_rate),
      notes: "",
      material_name: item.raw_material_name,
      material_code: item.raw_material_code,
      material_unit: item.raw_material_unit,
      remaining: Number(item.remaining_quantity),
    }))
  );

  const [state, formAction] = useActionState(
    async (prevState: ReceiveFormState, formData: FormData): Promise<ReceiveFormState> => {
      // The action redirects on success, so we only get here on error
      await receivePurchaseOrderItemsAction(formData);
      return prevState; // This line won't be reached due to redirect
    },
    { error: undefined }
  );

  const updateItem = (index: number, field: string, value: string) => {
    setReceiveItems(receiveItems.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const itemsToSubmit = receiveItems
      .filter((item) => Number(item.received_quantity) > 0)
      .map(({ purchase_order_item_id, received_quantity, unit_cost, tax_rate, notes }) => ({
        purchase_order_item_id,
        received_quantity,
        unit_cost,
        tax_rate,
        notes,
      }));

    if (itemsToSubmit.length === 0) {
      alert("Please enter at least one quantity to receive");
      return;
    }

    const formData = new FormData();
    formData.set("purchase_order_id", poId);
    formData.set("items", JSON.stringify(itemsToSubmit));
    formData.set("notes", "");
    formAction(formData);
  };

  const canReceive = poStatus !== "RECEIVED" && poStatus !== "CANCELLED";

  if (!canReceive) {
    return (
      <div className="rounded-md bg-gray-50 p-6 text-center">
        <p className="text-gray-600">
          {poStatus === "RECEIVED" ? "This purchase order has been fully received." : "This purchase order is cancelled."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="purchase_order_id" value={poId} />

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200" role="table">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receive Qty</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax %</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {receiveItems.map((item, index) => (
              <tr key={index}>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{item.material_name}</p>
                    {item.material_code && <p className="text-sm text-gray-500">{item.material_code}</p>}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {Number(item.remaining + Number(item.received_quantity || 0)).toFixed(3)} {item.material_unit}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {Number(item.received_quantity || 0).toFixed(3)} {item.material_unit}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                  {item.remaining.toFixed(3)} {item.material_unit}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={item.received_quantity}
                    onChange={(e) => updateItem(index, "received_quantity", e.target.value)}
                    step="0.001"
                    min="0"
                    max={item.remaining}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
                    placeholder="0"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={item.unit_cost}
                    onChange={(e) => updateItem(index, "unit_cost", e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={item.tax_rate}
                    onChange={(e) => updateItem(index, "tax_rate", e.target.value)}
                    step="0.01"
                    min="0"
                    max="100"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => updateItem(index, "notes", e.target.value)}
                    maxLength={500}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-10"
                    placeholder="Optional notes"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state.error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Error: {state.error}
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t">
        <button
          type="submit"
          disabled={receiveItems.every((item) => !item.received_quantity || Number(item.received_quantity) <= 0)}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Receive Goods
        </button>
        <a
          href={`/purchases/${poId}`}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-10"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}