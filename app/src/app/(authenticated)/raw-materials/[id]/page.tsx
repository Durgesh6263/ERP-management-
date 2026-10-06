import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ConfirmSubmit from "@/components/confirm-submit";
import StockAdjustmentForm from "@/components/materials/stock-adjustment-form";
import { addRawMaterialStockAction, setRawMaterialStatusAction } from "@/lib/materials/actions";
import { getAuthContext } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { InventoryRecord, RawMaterial } from "@/types/material";

export const dynamic = "force-dynamic";

function quantity(value: string | number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(Number(value));
}

const notices: Record<string, string> = {
  material_created: "Raw material created.",
  material_updated: "Raw material updated.",
  material_deactivated: "Raw material deactivated. Stock and history remain recorded.",
  material_activated: "Raw material activated.",
};

export default async function RawMaterialDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const context = await getAuthContext();
  if (!context) redirect("/login?error=account_unavailable");
  if (!hasPermission({ permissions: context.permissions }, "raw_materials.view")) redirect("/");
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <p className="text-sm text-[var(--signal)]">Supabase is not configured.</p>;

  const [{ data: materialData, error: materialError }, { data: inventoryData, error: inventoryError }] = await Promise.all([
    supabase.from("raw_materials").select("*").eq("id", id).eq("business_id", context.user.business_id).maybeSingle(),
    supabase.from("inventory").select("*").eq("business_id", context.user.business_id).eq("item_type", "raw_material").eq("item_id", id).maybeSingle(),
  ]);
  if (materialError || !materialData) notFound();
  if (inventoryError || !inventoryData) return <p className="text-sm text-[var(--signal)]">Inventory record could not be loaded.</p>;

  const material = materialData as RawMaterial;
  const inventory = inventoryData as InventoryRecord;
  const canEdit = hasPermission({ permissions: context.permissions }, "raw_materials.edit");
  const canDeactivate = hasPermission({ permissions: context.permissions }, "raw_materials.delete");
  const canAddStock = hasPermission({ permissions: context.permissions }, "inventory.add_stock");
  const canAdjust = hasPermission({ permissions: context.permissions }, "inventory.adjust");
  const canViewHistory = hasPermission({ permissions: context.permissions }, "inventory.view_history");
  const lowStock = Number(material.current_stock) <= Number(material.reorder_level);
  const paramsValue = await searchParams;
  const notice = paramsValue.notice ? notices[paramsValue.notice] : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <Link className="text-sm font-medium text-[var(--accent)] hover:underline" href="/raw-materials">Raw materials</Link>
          <h1 className="mt-2 text-3xl font-semibold">{material.name}</h1>
          <p className="mt-2 font-mono text-sm text-[var(--muted)]">{material.code || "No code"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`border px-2.5 py-1.5 text-xs font-semibold ${material.status === "ACTIVE" ? "border-[#b8d7c7] bg-[#eef5f0] text-[var(--accent-strong)]" : "border-[#e6c5b9] bg-[#fbf0ec] text-[var(--signal)]"}`}>{material.status}</span>
          {lowStock && <span className="border border-[#e6c5b9] bg-[#fbf0ec] px-2.5 py-1.5 text-xs font-semibold text-[var(--signal)]">Low stock</span>}
          {canEdit && <Link className="rounded-sm bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]" href={`/raw-materials/${id}/edit`}>Edit material</Link>}
          {material.status === "ACTIVE" && canDeactivate && <ConfirmSubmit action={setRawMaterialStatusAction} fieldName="raw_material_id" fieldValue={id} hiddenFields={{ status: "INACTIVE" }} label="Deactivate" confirmation={`Deactivate ${material.name}? Stock and transactions remain recorded.`} className="rounded-sm border border-[var(--line)] px-3 py-2 text-sm font-medium hover:bg-white" />}
          {material.status === "INACTIVE" && canEdit && <ConfirmSubmit action={setRawMaterialStatusAction} fieldName="raw_material_id" fieldValue={id} hiddenFields={{ status: "ACTIVE" }} label="Activate" confirmation={`Activate ${material.name}?`} className="rounded-sm border border-[var(--line)] px-3 py-2 text-sm font-medium hover:bg-white" />}
        </div>
      </div>
      {notice && <p className="mt-5 border-l-2 border-[var(--accent)] bg-[#eef5f0] px-3 py-2 text-sm text-[var(--accent-strong)]" role="status">{notice}</p>}

      <dl className="mt-8 grid gap-x-10 gap-y-6 border-b border-[var(--line)] pb-8 sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-xs font-semibold uppercase text-[var(--muted)]">Unit</dt><dd className="mt-1 text-sm font-medium">{material.unit}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-[var(--muted)]">Current stock</dt><dd className="mt-1 text-sm font-medium">{quantity(inventory.current_stock)} {material.unit}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-[var(--muted)]">Reserved</dt><dd className="mt-1 text-sm font-medium">{quantity(inventory.reserved_stock)} {material.unit}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-[var(--muted)]">Available</dt><dd className="mt-1 text-sm font-medium">{quantity(inventory.available_stock)} {material.unit}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-[var(--muted)]">Minimum stock</dt><dd className="mt-1 text-sm font-medium">{quantity(material.min_stock)} {material.unit}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-[var(--muted)]">Reorder level</dt><dd className="mt-1 text-sm font-medium">{quantity(material.reorder_level)} {material.unit}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-[var(--muted)]">Purchase price</dt><dd className="mt-1 text-sm font-medium">{material.purchase_price}</dd></div>
      </dl>

      {(canAddStock || canAdjust) && (
        <section className="mt-8 grid gap-8 lg:grid-cols-2">
          {canAddStock && (
            <div>
              <h2 className="text-lg font-semibold">Add stock</h2>
              <form action={addRawMaterialStockAction} className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-end">
                <input type="hidden" name="raw_material_id" value={id} />
                <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">Quantity ({material.unit})<input className="min-h-9 rounded-sm border border-[var(--line)] bg-white px-2 text-sm font-normal" min="0.001" name="quantity" required step="0.001" type="number" /></label>
                <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">Notes<input className="min-h-9 rounded-sm border border-[var(--line)] bg-white px-2 text-sm font-normal" maxLength={500} name="notes" /></label>
                <button className="min-h-9 rounded-sm bg-[var(--accent)] px-3 text-xs font-semibold text-white" type="submit">Record stock-in</button>
              </form>
            </div>
          )}
          {canAdjust && <div><h2 className="text-lg font-semibold">Adjust stock</h2><div className="mt-4"><StockAdjustmentForm materialId={id} materialName={material.name} currentStock={inventory.current_stock} /></div></div>}
        </section>
      )}
      {canViewHistory && <Link className="mt-8 inline-block text-sm font-semibold text-[var(--accent)] hover:underline" href={`/inventory/transactions?material=${id}`}>View transaction history</Link>}
    </div>
  );
}