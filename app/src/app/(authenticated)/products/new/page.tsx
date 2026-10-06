import { redirect } from "next/navigation";
import ProductForm from "@/components/products/product-form";
import { getAuthContext } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions/authorization";
import { EMPTY_PRODUCT_FORM_VALUES } from "@/lib/products/form-values";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProductCategory } from "@/types/product";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login?error=account_unavailable");
  if (!hasPermission({ permissions: context.permissions }, "products.view")) redirect("/");
  if (!hasPermission({ permissions: context.permissions }, "products.create")) redirect("/products");
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <p className="text-sm text-[var(--signal)]">Supabase is not configured.</p>;

  const { data, error } = await supabase
    .from("categories")
    .select("id, business_id, parent_id, name, status, created_at, updated_at")
    .eq("business_id", context.user.business_id)
    .order("name")
    .limit(500);
  if (error) return <p className="text-sm text-[var(--signal)]">Categories could not be loaded. Try again later.</p>;

  return (
    <div>
      <div className="mb-8 border-b border-[var(--line)] pb-5">
        <p className="text-xs font-semibold uppercase text-[var(--accent)]">Product configuration</p>
        <h1 className="mt-2 text-3xl font-semibold">New product</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Capacity and timing are configuration only; no schedule is created here.</p>
      </div>
      <ProductForm
        initialValues={EMPTY_PRODUCT_FORM_VALUES}
        categories={(data ?? []) as ProductCategory[]}
        canChangePrice
        canChangeCapacity
        canChangeProductionTime
        canChangeDeliveryTime
      />
    </div>
  );
}