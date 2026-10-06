"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BomRequirement } from "@/types/material";

export type BomCalculationState = {
  error?: string;
  requirements?: BomRequirement[];
  orderQuantity?: string;
};

async function authorizeBomEdit() {
  const context = await getAuthContext();
  if (!context) redirect("/login?error=account_unavailable");
  if (!hasPermission({ permissions: context.permissions }, "products.edit")) redirect("/products?error=forbidden");
  const supabase = await createServerSupabaseClient();
  return supabase ? { context, supabase } : null;
}

function quantityIsValid(value: string): boolean {
  return /^\d{1,11}(?:\.\d{1,6})?$/.test(value) && Number(value) > 0;
}

function detailRedirect(productId: string, key: string, value: string): never {
  redirect(`/products/${productId}?${key}=${encodeURIComponent(value)}`);
}

export async function createProductBomAction(formData: FormData): Promise<never> {
  const actionContext = await authorizeBomEdit();
  if (!actionContext) redirect("/products?error=auth_unconfigured");
  const { context, supabase } = actionContext;
  const productId = String(formData.get("product_id") ?? "");
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("business_id", context.user.business_id)
    .maybeSingle();
  if (productError || !product) detailRedirect(productId, "bom_error", "product_not_found");

  const { data: versions, error: versionsError } = await supabase
    .from("product_bom")
    .select("version, active")
    .eq("product_id", productId)
    .eq("business_id", context.user.business_id)
    .order("version", { ascending: false })
    .limit(1);
  if (versionsError) detailRedirect(productId, "bom_error", "bom_load_failed");
  if (versions?.some((version) => version.active)) detailRedirect(productId, "bom_error", "active_bom_exists");

  const version = versions?.[0]?.version ? Number(versions[0].version) + 1 : 1;
  const { error } = await supabase.from("product_bom").insert({
    business_id: context.user.business_id,
    product_id: productId,
    version,
    active: true,
  });
  if (error) detailRedirect(productId, "bom_error", error.code === "23505" ? "active_bom_exists" : "bom_create_failed");
  revalidatePath(`/products/${productId}`);
  detailRedirect(productId, "bom_notice", "bom_created");
}

export async function addBomItemAction(formData: FormData): Promise<never> {
  const actionContext = await authorizeBomEdit();
  if (!actionContext) redirect("/products?error=auth_unconfigured");
  const { context, supabase } = actionContext;
  const productId = String(formData.get("product_id") ?? "");
  const materialId = String(formData.get("raw_material_id") ?? "");
  const quantity = String(formData.get("quantity_per_unit") ?? "").trim();
  if (!quantityIsValid(quantity)) detailRedirect(productId, "bom_error", "invalid_bom_quantity");

  const { data: bom, error: bomError } = await supabase
    .from("product_bom")
    .select("id")
    .eq("product_id", productId)
    .eq("business_id", context.user.business_id)
    .eq("active", true)
    .maybeSingle();
  if (bomError || !bom) detailRedirect(productId, "bom_error", "active_bom_required");

  const { data: material, error: materialError } = await supabase
    .from("raw_materials")
    .select("id")
    .eq("id", materialId)
    .eq("business_id", context.user.business_id)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (materialError || !material) detailRedirect(productId, "bom_error", "invalid_material");

  const { error } = await supabase.from("bom_items").insert({
    business_id: context.user.business_id,
    bom_id: bom.id,
    raw_material_id: materialId,
    quantity_per_unit: quantity,
  });
  if (error) detailRedirect(productId, "bom_error", error.code === "23505" ? "duplicate_bom_material" : "bom_item_save_failed");
  revalidatePath(`/products/${productId}`);
  detailRedirect(productId, "bom_notice", "bom_material_added");
}

export async function updateBomItemAction(formData: FormData): Promise<never> {
  const actionContext = await authorizeBomEdit();
  if (!actionContext) redirect("/products?error=auth_unconfigured");
  const { context, supabase } = actionContext;
  const productId = String(formData.get("product_id") ?? "");
  const bomItemId = String(formData.get("bom_item_id") ?? "");
  const quantity = String(formData.get("quantity_per_unit") ?? "").trim();
  if (!quantityIsValid(quantity)) detailRedirect(productId, "bom_error", "invalid_bom_quantity");
  const { error } = await supabase
    .from("bom_items")
    .update({ quantity_per_unit: quantity })
    .eq("id", bomItemId)
    .eq("business_id", context.user.business_id);
  if (error) detailRedirect(productId, "bom_error", "bom_item_save_failed");
  revalidatePath(`/products/${productId}`);
  detailRedirect(productId, "bom_notice", "bom_item_updated");
}

export async function removeBomItemAction(formData: FormData): Promise<never> {
  const actionContext = await authorizeBomEdit();
  if (!actionContext) redirect("/products?error=auth_unconfigured");
  const { context, supabase } = actionContext;
  const productId = String(formData.get("product_id") ?? "");
  const bomItemId = String(formData.get("bom_item_id") ?? "");
  const { error } = await supabase
    .from("bom_items")
    .delete()
    .eq("id", bomItemId)
    .eq("business_id", context.user.business_id);
  if (error) detailRedirect(productId, "bom_error", "bom_item_remove_failed");
  revalidatePath(`/products/${productId}`);
  detailRedirect(productId, "bom_notice", "bom_item_removed");
}

export async function setBomActiveAction(formData: FormData): Promise<never> {
  const actionContext = await authorizeBomEdit();
  if (!actionContext) redirect("/products?error=auth_unconfigured");
  const { context, supabase } = actionContext;
  const productId = String(formData.get("product_id") ?? "");
  const bomId = String(formData.get("bom_id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  const { error } = await supabase.rpc("set_product_bom_active", {
    target_business_id: context.user.business_id,
    target_bom_id: bomId,
    target_active: active,
  });
  if (error) detailRedirect(productId, "bom_error", error.code === "42501" ? "forbidden" : "bom_status_failed");
  revalidatePath(`/products/${productId}`);
  detailRedirect(productId, "bom_notice", active ? "bom_activated" : "bom_deactivated");
}

export async function calculateBomRequirementsAction(
  _previousState: BomCalculationState,
  formData: FormData,
): Promise<BomCalculationState> {
  const productId = String(formData.get("product_id") ?? "");
  const orderQuantity = String(formData.get("order_quantity") ?? "").trim();
  if (!/^\d{1,11}(?:\.\d{1,6})?$/.test(orderQuantity) || Number(orderQuantity) <= 0) {
    return { error: "invalid_order_quantity", orderQuantity };
  }
  const context = await getAuthContext();
  if (!context) redirect("/login?error=account_unavailable");
  if (
    !hasPermission({ permissions: context.permissions }, "products.view") ||
    !hasPermission({ permissions: context.permissions }, "raw_materials.view")
  ) {
    return { error: "forbidden", orderQuantity };
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "auth_unconfigured", orderQuantity };
  const { data, error } = await supabase.rpc("calculate_product_material_requirements", {
    target_business_id: context.user.business_id,
    target_product_id: productId,
    target_order_quantity: orderQuantity,
  });
  if (error) return { error: "calculation_failed", orderQuantity };
  const requirements = (data ?? []) as BomRequirement[];
  return requirements.length > 0
    ? { requirements, orderQuantity }
    : { error: "no_active_bom", orderQuantity };
}