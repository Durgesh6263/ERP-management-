"use client";

import { useState } from "react";
import Link from "next/link";
import { ReceiveForm } from "@/components/purchases/receive-form";
import type { PurchaseOrder, PurchaseOrderItemWithMaterial } from "@/types/supplier";

interface PurchaseDetailProps {
  po: PurchaseOrder & {
    supplier: {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
      address: string | null;
      gst_number: string | null;
    } | null;
  };
  items: PurchaseOrderItemWithMaterial[];
  receipts: Array<{
    id: string;
    received_quantity: string | number;
    unit_cost: string | number;
    tax_rate: string | number;
    notes: string | null;
    received_at: string;
    raw_material: { code: string | null; name: string; unit: string } | null;
  }>;
  canEdit: boolean;
  canDelete: boolean;
  canReceive: boolean;
}

export function PurchaseDetail({ po, items, receipts, canEdit, canDelete, canReceive }: PurchaseDetailProps) {
  const [showReceive, setShowReceive] = useState(false);

  const handleStatusChange = (newStatus: string) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/po-status";
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "purchase_order_id";
    input.value = po.id;
    const input2 = document.createElement("input");
    input2.type = "hidden";
    input2.name = "status";
    input2.value = newStatus;
    form.appendChild(input);
    form.appendChild(input2);
    document.body.appendChild(form);
    form.submit();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-100 text-gray-800";
      case "ORDERED": return "bg-blue-100 text-blue-800";
      case "PARTIAL": return "bg-yellow-100 text-yellow-800";
      case "RECEIVED": return "bg-green-100 text-green-800";
      case "CANCELLED": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const canOrder = po.status === "DRAFT" && canEdit;
  const canCancel = (po.status === "DRAFT" || po.status === "ORDERED" || po.status === "PARTIAL") && canDelete;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{po.po_number}</h1>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(po.status)}`}>
              {po.status}
            </span>
          </div>
          <p className="text-sm text-gray-500">Ordered {new Date(po.order_date).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canOrder && (
            <button
              onClick={() => handleStatusChange("ORDERED")}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-10"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mark Ordered
            </button>
          )}
          {canReceive && po.status !== "RECEIVED" && po.status !== "CANCELLED" && (
            <button
              onClick={() => setShowReceive(true)}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-10"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Receive Goods
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to cancel this purchase order?")) {
                  handleStatusChange("CANCELLED");
                }
              }}
              className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 min-h-10"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel PO
            </button>
          )}
          {canEdit && po.status === "DRAFT" && (
            <Link
              href={`/purchases/${po.id}/edit`}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-10"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Link>
          )}
        </div>
      </div>

      {showReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Receive Goods - {po.po_number}</h2>
              <button
                onClick={() => setShowReceive(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ReceiveForm poId={po.id} items={items} poStatus={po.status} />
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Items</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" role="table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Line Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.raw_material_name}</p>
                      {item.raw_material_code && <p className="text-sm text-gray-500">{item.raw_material_code}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {Number(item.ordered_quantity).toFixed(3)} {item.raw_material_unit}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {Number(item.received_quantity).toFixed(3)} {item.raw_material_unit}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {Number(item.remaining_quantity).toFixed(3)} {item.raw_material_unit}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {Number(item.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {Number(item.tax_rate).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {Number(item.line_total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Summary</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Supplier</dt>
              <dd className="text-sm text-gray-900 font-medium">{po.supplier?.name ?? "Unknown"}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Order Date</dt>
              <dd className="text-sm text-gray-900">{new Date(po.order_date).toLocaleDateString()}</dd>
            </div>
            {po.expected_date && (
              <div>
                <dt className="text-sm text-gray-500">Expected Date</dt>
                <dd className="text-sm text-gray-900">{new Date(po.expected_date).toLocaleDateString()}</dd>
              </div>
            )}
            <div className="border-t pt-3">
              <dt className="text-sm text-gray-500">Subtotal</dt>
              <dd className="text-sm text-gray-900">{Number(po.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Tax</dt>
              <dd className="text-sm text-gray-900">{Number(po.tax_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
            </div>
            <div className="border-t pt-3">
              <dt className="text-sm font-medium text-gray-500">Total</dt>
              <dd className="text-lg font-bold text-gray-900">{Number(po.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
            </div>
          </dl>

          {po.notes && (
            <div className="mt-6 pt-6 border-t">
              <dt className="text-sm text-gray-500">Notes</dt>
              <dd className="text-sm text-gray-900 whitespace-pre-wrap mt-1">{po.notes}</dd>
            </div>
          )}
        </div>
      </div>

      {receipts.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Receipt History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" role="table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received At</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {receipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {receipt.raw_material?.name ?? "Unknown"}
                      {receipt.raw_material?.code && <span className="text-gray-500 ml-1">({receipt.raw_material.code})</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {Number(receipt.received_quantity).toFixed(3)} {receipt.raw_material?.unit ?? ""}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {Number(receipt.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {Number(receipt.tax_rate).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(receipt.received_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {receipt.notes ?? <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}