"use client";

import { adjustRawMaterialStockAction } from "@/lib/materials/actions";

export default function StockAdjustmentForm({
  materialId,
  materialName,
  currentStock,
  compact = false,
}: {
  materialId: string;
  materialName: string;
  currentStock: string | number;
  compact?: boolean;
}) {
  return (
    <form
      action={adjustRawMaterialStockAction}
      className={compact ? "grid gap-2 sm:grid-cols-[110px_minmax(140px,1fr)_auto]" : "grid gap-3 sm:grid-cols-[150px_minmax(220px,1fr)_auto]"}
      onSubmit={(event) => {
        if (!window.confirm(`Set ${materialName} stock to the entered quantity? This creates an adjustment transaction and audit record.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="raw_material_id" value={materialId} />
      <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
        New stock
        <input className="min-h-9 rounded-sm border border-[var(--line)] bg-white px-2 text-sm font-normal text-[var(--foreground)]" defaultValue={String(currentStock)} min="0" name="new_stock" required step="0.001" type="number" />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
        Reason
        <input className="min-h-9 rounded-sm border border-[var(--line)] bg-white px-2 text-sm font-normal text-[var(--foreground)]" maxLength={500} name="reason" placeholder="Required" required />
      </label>
      <div className="flex items-end">
        <button className="min-h-9 rounded-sm border border-[var(--line)] bg-white px-3 text-xs font-semibold hover:bg-[#eaf0eb]" type="submit">Adjust stock</button>
      </div>
    </form>
  );
}