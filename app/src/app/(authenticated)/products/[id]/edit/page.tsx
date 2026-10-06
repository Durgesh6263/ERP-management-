import { notFound, redirect } from "next/navigation";
import ProductForm from "@/components/products/product-form";
import { getAuthContext } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions/authorization";
import { productToFormValues } from "@/lib/products/form-values";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Product, ProductCategory } from "@/types/product";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await getAuthContext();
  if (!context) redirect("/login?error=account_unavailable");
  if (!hasPermission({ permissions: context.permissions }, "products.view")) redirect("/");
  if (!hasPermission({ permissions: context.permissions }, "products.edit")) redirect("/products");
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <p className="text-sm text-[var(--signal)]">Supabase is not configured.</p>;

  const [{ data: productData, error: productError }, { data: categoryData, error: categoryError }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .eq("business_id", context.user.business_id)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, business_id, parent_id, name, status, created_at, updated_at")
      .eq("business_id", context.user.business_id)
      .order("name")
      .limit(500),
  ]);
  if (productError || !productData) notFound();
  if (categoryError) return <p className="text-sm text-[var(--signal)]">Categories could not be loaded.</p>;

  const product = productData as Product;
  const permissions = context.permissions;
  return (
    <div>
      <div className="mb-8 border-b border-[var(--line)] pb-5">
        <p className="text-xs font-semibold uppercase text-[var(--accent)]">Product configuration</p>
        <h1 className="mt-2 text-3xl font-semibold">Edit {product.name}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Protected settings remain read-only unless their specific permission is granted.</p>
      </div>
      <ProductForm
        productId={product.id}
        initialValues={productToFormValues(product)}
        categories={(categoryData ?? []) as ProductCategory[]}
        canChangePrice={hasPermission({ permissions }, "products.change_price")}
        canChangeCapacity={hasPermission({ permissions }, "products.change_capacity")}
        canChangeProductionTime={hasPermission({ permissions }, "products.change_production_time")}
        canChangeDeliveryTime={hasPermission({ permissions }, "products.change_delivery_time")}
      />
    </div>
  );
}