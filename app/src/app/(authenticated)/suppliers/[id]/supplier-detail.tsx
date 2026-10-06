"use client";

import Link from "next/link";
import type { Supplier } from "@/types/supplier";

interface SupplierDetailProps {
  supplier: Supplier & { business_id: string };
  purchaseOrders: Array<{
    id: string;
    po_number: string;
    order_date: string;
    expected_date: string | null;
    status: string;
    total_amount: string | number;
  }>;
  canEdit: boolean;
  canDelete: boolean;
  canCreatePo: boolean;
}

export function SupplierDetail({ supplier, purchaseOrders, canEdit, canDelete, canCreatePo }: SupplierDetailProps) {
  const handleDeactivate = () => {
    if (confirm("Are you sure you want to deactivate this supplier?")) {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/supplier-status";
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "supplier_id";
      input.value = supplier.id;
      const input2 = document.createElement("input");
      input2.type = "hidden";
      input2.name = "status";
      input2.value = "INACTIVE";
      form.appendChild(input);
      form.appendChild(input2);
      document.body.appendChild(form);
      form.submit();
    }
  };

  const handleActivate = () => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/supplier-status";
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "supplier_id";
    input.value = supplier.id;
    const input2 = document.createElement("input");
    input2.type = "hidden";
    input2.name = "status";
    input2.value = "ACTIVE";
    form.appendChild(input);
    form.appendChild(input2);
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
          <p className="text-sm text-gray-500">Created {new Date(supplier.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canCreatePo && (
            <Link
              href="/purchases/new"
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-10"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create PO
            </Link>
          )}
          {canEdit && (
            <Link
              href={`/suppliers/${supplier.id}/edit`}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-10"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Link>
          )}
          {canDelete && supplier.status === "ACTIVE" && (
            <button
              onClick={handleDeactivate}
              className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 min-h-10"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Deactivate
            </button>
          )}
          {supplier.status === "INACTIVE" && canDelete && (
            <button
              onClick={handleActivate}
              className="inline-flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-10"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Activate
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h2>
          <dl className="space-y-4">
            {supplier.phone && (
              <div>
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd className="text-sm text-gray-900">{supplier.phone}</dd>
              </div>
            )}
            {supplier.email && (
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{supplier.email}</dd>
              </div>
            )}
            {supplier.gst_number && (
              <div>
                <dt className="text-sm text-gray-500">GST Number</dt>
                <dd className="text-sm text-gray-900 font-mono">{supplier.gst_number}</dd>
              </div>
            )}
            {supplier.address && (
              <div>
                <dt className="text-sm text-gray-500">Address</dt>
                <dd className="text-sm text-gray-900 whitespace-pre-wrap">{supplier.address}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Status</h2>
          <div className="space-y-3">
            <div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                supplier.status === "ACTIVE"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}>
                {supplier.status}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Updated: {new Date(supplier.updated_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {purchaseOrders.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Purchase Orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" role="table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 font-medium text-gray-900">
                      <Link href={`/purchases/${po.id}`} className="hover:text-indigo-600">
                        {po.po_number}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {new Date(po.order_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {po.expected_date ? new Date(po.expected_date).toLocaleDateString() : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          po.status === "DRAFT" ? "bg-gray-100 text-gray-800" :
                          po.status === "ORDERED" ? "bg-blue-100 text-blue-800" :
                          po.status === "PARTIAL" ? "bg-yellow-100 text-yellow-800" :
                          po.status === "RECEIVED" ? "bg-green-100 text-green-800" :
                          "bg-red-100 text-red-800"
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {Number(po.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/purchases/${po.id}`}
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                      >
                        View
                      </Link>
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