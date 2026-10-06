import ConfirmSubmit from "@/components/confirm-submit";
import BomCalculator from "@/components/bom/bom-calculator";
import { addBomItemAction, createProductBomAction, removeBomItemAction, setBomActiveAction, updateBomItemAction } from "@/lib/bom/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BomItem, ProductBom, RawMaterial } from "@/types/material";

const messageText: Record<string, string> = {
  bom_created: "BOM version created.",
  bom_activated: "BOM version activated.",
  bom_deactivated: "BOM version deactivated.",
  bom_material_added: "Material added to BOM.",
  bom_item_updated: "BOM quantity updated.",
  bom_item_removed: "Material removed from BOM.",
  active_bom_exists: "An active BOM already exists.",
  active_bom_required: "Create or activate a BOM before adding materials.",
  invalid_material: "Choose an active raw material in this business.",
  duplicate_bom_material: "A material can appear only once in a BOM.",
  invalid_bom_quantity: "Quantity per product unit must be greater than zero.",
  bom_create_failed: "BOM could not be created.",
  bom_item_save_failed: "BOM material could not be saved.",
  bom_item_remove_failed: "BOM material could not be removed.",
  bom_status_failed: "BOM status could not be changed.",
};

export default async function ProductBomSection({
  productId,
  businessId,
  canEdit,
  canViewMaterials,
  notice,
  error,
}: {
  productId: string;
  businessId: string;
  canEdit: boolean;
  canViewMaterials: boolean;
  notice?: string;
  error?: string;
}) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data: bomData, error: bomError } = await supabase
    .from("product_bom")
    .select("*")
    .eq("business_id", businessId)
    .eq("product_id", productId)
    .order("version", { ascending: false });
  if (bomError) return <p className="mt-8 text-sm text-[var(--signal)]">BOM configuration could not be loaded.</p>;

  const boms = (bomData ?? []) as ProductBom[];
  const bomIds = boms.map((bom) => bom.id);
  const [{ data: itemData, error: itemError }, { data: materialData, error: materialError }] = await Promise.all([
    bomIds.length ? supabase.from("bom_items").select("*").eq("business_id", businessId).in("bom_id", bomIds).order("created_at") : Promise.resolve({ data: [], error: null }),
    canViewMaterials ? supabase.from("raw_materials").select("id, code, name, unit, status").eq("business_id", businessId).order("name").limit(500) : Promise.resolve({ data: [], error: null }),
  ]);
  if (itemError || materialError) return <p className="mt-8 text-sm text-[var(--signal)]">BOM details could not be loaded.</p>;

  const items = (itemData ?? []) as BomItem[];
  const materials = (materialData ?? []) as Pick<RawMaterial, "id" | "code" | "name" | "unit" | "status">[];
  const materialMap = new Map(materials.map((material) => [material.id, material]));
  const activeBom = boms.find((bom) => bom.active);
  const message = notice ? messageText[notice] : error ? messageText[error] : null;

  return (
    <section className="mt-9 border-t border-[var(--line)] pt-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase text-[var(--accent)]">Materials configuration</p><h2 className="mt-1 text-xl font-semibold">Bill of materials</h2><p className="mt-1 text-sm text-[var(--muted)]">Required raw-material quantities per product unit. No stock is consumed here.</p></div>
        {!activeBom && canEdit && <form action={createProductBomAction}><input type="hidden" name="product_id" value={productId} /><button className="min-h-9 rounded-sm bg-[var(--accent)] px-3 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]" type="submit">Create active BOM</button></form>}
      </div>
      {message && <p className={`mt-4 border-l-2 px-3 py-2 text-sm ${error ? "border-[var(--signal)] bg-[#fbf0ec] text-[var(--signal)]" : "border-[var(--accent)] bg-[#eef5f0] text-[var(--accent-strong)]"}`} role={error ? "alert" : "status"}>{message}</p>}
      {boms.length === 0 ? <p className="mt-4 text-sm text-[var(--muted)]">No BOM has been configured for this product.</p> : (
        <div className="mt-5 space-y-7">
          {boms.map((bom) => {
            const bomItems = items.filter((item) => item.bom_id === bom.id);
            return (
              <div className="border-b border-[var(--line)] pb-6" key={bom.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3"><h3 className="text-sm font-semibold">Version {bom.version}</h3><span className={`border px-2 py-1 text-xs font-semibold ${bom.active ? "border-[#b8d7c7] bg-[#eef5f0] text-[var(--accent-strong)]" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}>{bom.active ? "Active" : "Inactive"}</span></div>
                  {canEdit && <ConfirmSubmit action={setBomActiveAction} fieldName="bom_id" fieldValue={bom.id} hiddenFields={{ product_id: productId, active: String(!bom.active) }} label={bom.active ? "Deactivate BOM" : "Activate version"} confirmation={bom.active ? "Deactivate this BOM? It will not be used for requirement calculations." : "Activate this version? Any other active BOM will be deactivated."} className="text-xs font-semibold text-[var(--accent)] hover:underline" />}
                </div>
                <div className="mt-3 overflow-x-auto border-y border-[var(--line)]">
                  <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                    <thead className="bg-[#eaf0eb] text-xs uppercase text-[var(--muted)]"><tr><th className="px-3 py-2 font-semibold">Raw material</th><th className="px-3 py-2 font-semibold">Unit</th><th className="px-3 py-2 font-semibold">Quantity per product unit</th>{canEdit && <th className="px-3 py-2 font-semibold">Actions</th>}</tr></thead>
                    <tbody className="divide-y divide-[var(--line)]">
                      {bomItems.map((item) => {
                        const material = materialMap.get(item.raw_material_id);
                        return <tr className="bg-white" key={item.id}>
                          <td className="px-3 py-2">{material?.name ?? "Material detail unavailable"}{material?.code && <span className="ml-2 font-mono text-xs text-[var(--muted)]">{material.code}</span>}</td>
                          <td className="px-3 py-2">{material?.unit ?? "-"}</td>
                          <td className="px-3 py-2">{canEdit && bom.active ? <form action={updateBomItemAction} className="flex items-center gap-2"><input type="hidden" name="product_id" value={productId} /><input type="hidden" name="bom_item_id" value={item.id} /><input className="min-h-8 w-28 rounded-sm border border-[var(--line)] bg-white px-2 text-sm" defaultValue={String(item.quantity_per_unit)} min="0.000001" name="quantity_per_unit" required step="0.000001" type="number" /><button className="text-xs font-semibold text-[var(--accent)] hover:underline" type="submit">Save</button></form> : <span className="tabular-nums">{item.quantity_per_unit}</span>}</td>
                          {canEdit && <td className="px-3 py-2">{bom.active ? <ConfirmSubmit action={removeBomItemAction} fieldName="bom_item_id" fieldValue={item.id} hiddenFields={{ product_id: productId }} label="Remove" confirmation={`Remove ${material?.name ?? "this material"} from BOM version ${bom.version}?`} className="text-xs font-semibold text-[var(--signal)] hover:underline" /> : "-"}</td>}
                        </tr>;
                      })}
                      {bomItems.length === 0 && <tr><td className="px-3 py-5 text-sm text-[var(--muted)]" colSpan={canEdit ? 4 : 3}>No materials added to this BOM.</td></tr>}
                    </tbody>
                  </table>
                </div>
                {canEdit && bom.active && canViewMaterials && <form action={addBomItemAction} className="mt-4 grid gap-3 sm:grid-cols-[minmax(220px,1fr)_150px_auto] sm:items-end">
                  <input type="hidden" name="product_id" value={productId} />
                  <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">Raw material<select className="min-h-9 rounded-sm border border-[var(--line)] bg-white px-2 text-sm font-normal text-[var(--foreground)]" name="raw_material_id" required defaultValue=""><option value="" disabled>Select material</option>{materials.filter((material) => material.status === "ACTIVE").map((material) => <option key={material.id} value={material.id}>{material.name} ({material.unit})</option>)}</select></label>
                  <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">Quantity / product unit<input className="min-h-9 rounded-sm border border-[var(--line)] bg-white px-2 text-sm font-normal text-[var(--foreground)]" min="0.000001" name="quantity_per_unit" required step="0.000001" type="number" /></label>
                  <button className="min-h-9 rounded-sm border border-[var(--line)] bg-white px-3 text-xs font-semibold hover:bg-[#eaf0eb]" type="submit">Add material</button>
                </form>}
                {canEdit && bom.active && !canViewMaterials && <p className="mt-3 text-xs text-[var(--muted)]">Raw-material viewing permission is required to select BOM materials.</p>}
              </div>
            );
          })}
        </div>
      )}
      {activeBom && canViewMaterials && <BomCalculator productId={productId} />}
    </section>
  );
}