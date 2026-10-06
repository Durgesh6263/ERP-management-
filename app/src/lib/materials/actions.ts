"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { RAW_MATERIAL_UNITS, type RawMaterialFormValues } from "@/types/material";

export type RawMaterialActionState = { error?: string };

function rawMaterialValues(formData: FormData): RawMaterialFormValues {
  return {
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
    name: String(formData.get("name") ?? "").trim(),
    unit: String(formData.get("unit") ?? ""),
    min_stock: String(formData.get("min_stock") ?? "").trim(),
    reorder_level: String(formData.get("reorder_level") ?? "").trim(),
    purchase_price: String(formData.get("purchase_price") ?? "").trim(),
  };
}

function validAmount(value: string, wholeDigits: number, decimalDigits: number): boolean {
  return new RegExp(`^\\d{1,${wholeDigits}}(?:\\.\\d{1,${decimalDigits}})?$`).test(value);
}

function validateRawMaterial(values: RawMaterialFormValues): string | null {
  if (!values.name || values.name.length > 160) return "invalid_name";
  if (values.code && values.code.length > 64) return "invalid_code";
  if (!RAW_MATERIAL_UNITS.includes(values.unit as (typeof RAW_MATERIAL_UNITS)[number])) return "invalid_unit";
  if (!validAmount(values.min_stock, 11, 3)) return "invalid_min_stock";
  if (!validAmount(values.reorder_level, 11, 3)) return "invalid_reorder_level";
  if (!validAmount(values.purchase_price, 12, 2)) return "invalid_purchase_price";
  return null;
}

async function authorized(permission: string) {
  const context = await getAuthContext();
  if (!context) redirect("/login?error=account_unavailable");
  if (!hasPermission({ permissions: context.permissions }, permission)) redirect("/raw-materials?error=forbidden");
  const supabase = await createServerSupabaseClient();
  return supabase ? { context, supabase } : null;
}

export async function saveRawMaterialAction(
  _previousState: RawMaterialActionState,
  formData: FormData,
): Promise<RawMaterialActionState> {
  const materialId = String(formData.get("raw_material_id") ?? "");
  const actionContext = await authorized(materialId ? "raw_materials.edit" : "raw_materials.create");
  if (!actionContext) return { error: "auth_unconfigured" };
  const { context, supabase } = actionContext;
  const values = rawMaterialValues(formData);
  const validationError = validateRawMaterial(values);
  if (validationError) return { error: validationError };

  const payload = {
    business_id: context.user.business_id,
    code: values.code || null,
    name: values.name,
    unit: values.unit,
    min_stock: values.min_stock,
    reorder_level: values.reorder_level,
    purchase_price: values.purchase_price,
  };
  const result = materialId
    ? await supabase
        .from("raw_materials")
        .update(payload)
        .eq("id", materialId)
        .eq("business_id", context.user.business_id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("raw_materials")
        .insert(payload)
        .select("id")
        .single();

  if (result.error) return { error: result.error.code === "23505" ? "duplicate_code" : "save_failed" };
  if (!result.data?.id) return { error: "material_not_found" };
  revalidatePath("/raw-materials");
  revalidatePath("/inventory");
  redirect(materialId ? `/raw-materials/${materialId}?notice=material_updated` : `/raw-materials/${result.data.id}?notice=material_created`);
}

export async function setRawMaterialStatusAction(formData: FormData): Promise<never> {
  const context = await getAuthContext();
  if (!context) redirect("/login?error=account_unavailable");
  const materialId = String(formData.get("raw_material_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const permission = status === "INACTIVE" ? "raw_materials.delete" : "raw_materials.edit";
  if ((status !== "ACTIVE" && status !== "INACTIVE") || !hasPermission({ permissions: context.permissions }, permission)) {
    redirect("/raw-materials?error=forbidden");
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/raw-materials?error=auth_unconfigured");
  const { data: material, error: lookupError } = await supabase
    .from("raw_materials")
    .select("id, status")
    .eq("id", materialId)
    .eq("business_id", context.user.business_id)
    .maybeSingle();
  if (lookupError || !material) redirect("/raw-materials?error=material_not_found");
  if (material.status === status) redirect(`/raw-materials/${materialId}`);

  const { error } = await supabase
    .from("raw_materials")
    .update({ status })
    .eq("id", materialId)
    .eq("business_id", context.user.business_id);
  if (error) redirect("/raw-materials?error=status_failed");
  revalidatePath("/raw-materials");
  revalidatePath(`/raw-materials/${materialId}`);
  revalidatePath("/inventory");
  redirect(`/raw-materials/${materialId}?notice=${status === "INACTIVE" ? "material_deactivated" : "material_activated"}`);
}

export async function addRawMaterialStockAction(formData: FormData): Promise<never> {
  const context = await getAuthContext();
  if (!context) redirect("/login?error=account_unavailable");
  if (!hasPermission({ permissions: context.permissions }, "inventory.add_stock")) redirect("/inventory?error=forbidden");
  const materialId = String(formData.get("raw_material_id") ?? "");
  const quantity = String(formData.get("quantity") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!validAmount(quantity, 11, 3) || Number(quantity) <= 0 || notes.length > 500) redirect("/inventory?error=invalid_stock_entry");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/inventory?error=auth_unconfigured");
  const { error } = await supabase.rpc("record_raw_material_stock_in", {
    target_business_id: context.user.business_id,
    target_raw_material_id: materialId,
    target_quantity: quantity,
    target_notes: notes || null,
  });
  if (error) redirect(`/inventory?error=${error.code === "42501" ? "forbidden" : "stock_entry_failed"}`);
  revalidatePath("/inventory");
  revalidatePath("/inventory/transactions");
  revalidatePath("/raw-materials");
  revalidatePath(`/raw-materials/${materialId}`);
  redirect("/inventory?notice=stock_added");
}

export async function adjustRawMaterialStockAction(formData: FormData): Promise<never> {
  const context = await getAuthContext();
  if (!context) redirect("/login?error=account_unavailable");
  if (!hasPermission({ permissions: context.permissions }, "inventory.adjust")) redirect("/inventory?error=forbidden");
  const materialId = String(formData.get("raw_material_id") ?? "");
  const newStock = String(formData.get("new_stock") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!validAmount(newStock, 11, 3) || !reason || reason.length > 500) redirect("/inventory?error=invalid_adjustment");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/inventory?error=auth_unconfigured");
  const { error } = await supabase.rpc("adjust_raw_material_stock", {
    target_business_id: context.user.business_id,
    target_raw_material_id: materialId,
    target_new_stock: newStock,
    target_reason: reason,
  });
  if (error) redirect(`/inventory?error=${error.code === "42501" ? "forbidden" : "adjustment_failed"}`);
  revalidatePath("/inventory");
  revalidatePath("/inventory/transactions");
  revalidatePath("/raw-materials");
  revalidatePath(`/raw-materials/${materialId}`);
  redirect("/inventory?notice=stock_adjusted");
}