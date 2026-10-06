import Link from "next/link";
import { requireAuthContext, requirePermission } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions/authorization";
import { addRawMaterialStockAction } from "@/lib/materials/actions";
import StockAdjustmentForm from "@/components/materials/stock-adjustment-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { InventoryRecord, RawMaterial } from "@/types/material";

export const dynamic = "force-dynamic";

function quantity(value: string | number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(Number(value));
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string; page?: string }>;
}) {
  const context = await requireAuthContext();
  await requirePermission(context, "inventory.view");
  await requirePermission(context, "raw_materials.view");
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <p className="text-sm text-[var(--signal)]">Supabase is not configured.</p>;

  const pageNum = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isSafeInteger(pageNum) && pageNum > 0 ? pageNum : 1;
  const pageSize = 20;
  const { data, error, count } = await supabase
    .from("inventory")
    .select("*", { count: "exact" })
    .eq("business_id", context.user.business_id)
    .eq("item_type", "raw_material")
    .order("updated_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) return <p className="text-sm text-[var(--signal)]">Inventory could not be loaded.</p>;

  const inventoryRows = (data ?? []) as InventoryRecord[];
  const materialIds = inventoryRows.map((row) => row.item_id);
  const { data: materialData, error: materialError } = materialIds.length
    ? await supabase.from("raw_materials").select("*").eq("business_id", context.user.business_id).in("id", materialIds)
    : { data: [], error: null };
  if (materialError) return <p className="text-sm text-[var(--signal)]">Raw-material details could not be loaded.</p>;

  const materials = new Map(((materialData ?? []) as RawMaterial[]).map((material) => [material.id, material]));
  const canAdd = hasPermission({ permissions: context.permissions }, "inventory.add_stock");
  const canAdjust = hasPermission({ permissions: context.permissions }, "inventory.adjust");
  const canViewHistory = hasPermission({ permissions: context.permissions }, "inventory.view_history");
  const pages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const messages: Record<string, string> = {
    stock_added: "Stock entry recorded with transaction and audit log.",
    stock_adjusted: "Adjustment recorded with reason, transaction, and audit log.",
    forbidden: "You do not have permission for that inventory action.",
    invalid_stock_entry: "Enter a positive stock quantity.",
    invalid_adjustment: "Enter a non-negative new stock level and a reason.",
    auth_unconfigured: "Supabase is not configured for this environment.",
    stock_entry_failed: "Stock entry could not be recorded.",
    adjustment_failed: "Stock adjustment could not be recorded.",
  };
  const message = params.notice ? messages[params.notice] : params.error ? messages[params.error] : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--accent)]">Inventory</p>
          <h1 className="mt-2 text-3xl font-semibold">Raw-material stock</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Available stock is current stock minus reserved stock.</p>
        </div>
        {canViewHistory && <Link className="rounded-sm border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium hover:bg-[#eaf0eb]" href="/inventory/transactions">Transaction history</Link>}
      </div>
      {message && <p className={`mt-5 border-l-2 px-3 py-2 text-sm ${params.error ? "border-[var(--signal)] bg-[#fbf0ec] text-[var(--signal)]" : "border-[var(--accent)] bg-[#eef5f0] text-[var(--accent-strong)]"}`} role="status">{message}</p>}

      <div className="mt-5 flex justify-between text-sm text-[var(--muted)]"><p>{count ?? 0} tracked material{count === 1 ? "" : "s"}</p><p>Page {page} of {pages}</p></div>
      <div className="mt-3 overflow-x-auto border-y border-[var(--line)]">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-[#eaf0eb] text-xs uppercase text-[var(--muted)]"><tr>
            <th className="px-3 py-3 font-semibold">Material</th><th className="px-3 py-3 font-semibold">Current</th><th className="px-3 py-3 font-semibold">Reserved</th><th className="px-3 py-3 font-semibold">Available</th><th className="px-3 py-3 font-semibold">Reorder level</th><th className="px-3 py-3 font-semibold">Stock status</th><th className="px-3 py-3 font-semibold">Operations</th>
          </tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {inventoryRows.map((row) => {
              const material = materials.get(row.item_id);
              if (!material) return null;
              const lowStock = Number(row.current_stock) <= Number(material.reorder_level);
              return (
                <tr className="bg-white align-top" key={row.id}>
                  <td className="px-3 py-3">
                    <Link className="font-semibold hover:text-[var(--accent)]" href={`/raw-materials/${material.id}`}>{material.name}</Link>
                    <p className="mt-0.5 font-mono text-xs text-[var(--muted)]">{material.code || "-"} · {material.unit}</p>
                  </td>
                  <td className="px-3 py-3 tabular-nums">{quantity(row.current_stock)}</td>
                  <td className="px-3 py-3 tabular-nums">{quantity(row.reserved_stock)}</td>
                  <td className="px-3 py-3 tabular-nums">{quantity(row.available_stock)}</td>
                  <td className="px-3 py-3 tabular-nums">{quantity(material.reorder_level)} {material.unit}</td>
                  <td className="px-3 py-3">{lowStock ? <span className="border border-[#e6c5b9] bg-[#fbf0ec] px-2 py-1 text-xs font-semibold text-[var(--signal)]">Low stock</span> : <span className="text-xs text-[var(--muted)]">In range</span>}</td>
                  <td className="px-3 py-3">
                    {(canAdd || canAdjust) ? (
                      <details className="max-w-[480px]">
                        <summary className="cursor-pointer text-xs font-semibold text-[var(--accent)]">Stock actions</summary>
                        <div className="mt-3 grid gap-4">
                          {canAdd && (
                            <form action={addRawMaterialStockAction} className="grid gap-2 sm:grid-cols-[100px_minmax(120px,1fr)_auto]">
                              <input type="hidden" name="raw_material_id" value={material.id} />
                              <label className="grid gap-1 text-[10px] font-semibold text-[var(--muted)]">Add {material.unit}<input className="min-h-9 rounded-sm border border-[var(--line)] bg-white px-2 text-xs font-normal" min="0.001" name="quantity" required step="0.001" type="number" /></label>
                              <label className="grid gap-1 text-[10px] font-semibold text-[var(--muted)]">Notes<input className="min-h-9 rounded-sm border border-[var(--line)] bg-white px-2 text-xs font-normal" maxLength={500} name="notes" /></label>
                              <div className="flex items-end"><button className="min-h-9 rounded-sm bg-[var(--accent)] px-3 text-xs font-semibold text-white" type="submit">Record</button></div>
                            </form>
                          )}
                          {canAdjust && <StockAdjustmentForm compact materialId={material.id} materialName={material.name} currentStock={row.current_stock} />}
                        </div>
                      </details>
                    ) : <span className="text-xs text-[var(--muted)]">View only</span>}
                  </td>
                </tr>
              );
            })}
            {inventoryRows.length === 0 && <tr><td className="px-3 py-12 text-center text-[var(--muted)]" colSpan={7}>No raw-material stock is tracked yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        {page > 1 && <Link className="rounded-sm border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium" href={`/inventory?page=${page - 1}`}>Previous</Link>}
        {page < pages && <Link className="rounded-sm border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium" href={`/inventory?page=${page + 1}`}>Next</Link>}
      </div>
    </div>
  );
}