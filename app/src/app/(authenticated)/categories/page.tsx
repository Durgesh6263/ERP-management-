import { redirect } from "next/navigation";
import ConfirmSubmit from "@/components/confirm-submit";
import CategoryForm from "@/components/products/category-form";
import { getAuthContext } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions/authorization";
import { toggleCategoryStatusAction } from "@/lib/products/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProductCategory } from "@/types/product";

export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  category_created: "Category created.",
  category_activated: "Category activated.",
  category_deactivated: "Category deactivated. Products and subcategories were not deleted.",
  category_not_found: "That category is not available in this business.",
  category_update_failed: "Category status could not be changed.",
  auth_unconfigured: "Supabase is not configured for this environment.",
};

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const context = await getAuthContext();
  if (!context) redirect("/login?error=account_unavailable");
  if (!hasPermission({ permissions: context.permissions }, "products.view")) redirect("/");
  const canCreate = hasPermission({ permissions: context.permissions }, "products.create");
  const canEdit = hasPermission({ permissions: context.permissions }, "products.edit");
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <p className="text-sm text-[var(--signal)]">Supabase is not configured.</p>;

  const { data, error } = await supabase
    .from("categories")
    .select("id, business_id, parent_id, name, status, created_at, updated_at")
    .eq("business_id", context.user.business_id)
    .order("name")
    .limit(500);
  if (error) return <p className="text-sm text-[var(--signal)]">Categories could not be loaded.</p>;

  const categories = (data ?? []) as ProductCategory[];
  const names = new Map(categories.map((category) => [category.id, category.name]));
  const parentOptions = categories
    .filter((category) => !category.parent_id && category.status === "ACTIVE")
    .map(({ id, name }) => ({ id, name }));
  const message = params.notice ? messages[params.notice] : params.error ? messages[params.error] : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--accent)]">Product configuration</p>
          <h1 className="mt-2 text-3xl font-semibold">Categories</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Organize products into top-level categories and one subcategory level.</p>
        </div>
        <p className="text-sm text-[var(--muted)]">{categories.length} categor{categories.length === 1 ? "y" : "ies"}</p>
      </div>

      {message && <p className={`mt-5 border-l-2 px-3 py-2 text-sm ${params.error ? "border-[var(--signal)] bg-[#fbf0ec] text-[var(--signal)]" : "border-[var(--accent)] bg-[#eef5f0] text-[var(--accent-strong)]"}`} role="status">{message}</p>}

      {canCreate && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Add category</h2>
          <CategoryForm parentOptions={parentOptions} />
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Business categories</h2>
        <div className="mt-4 overflow-x-auto border-y border-[var(--line)]">
          <table className="w-full min-w-[600px] border-collapse text-left text-sm">
            <thead className="bg-[#eaf0eb] text-xs uppercase text-[var(--muted)]">
              <tr><th className="px-3 py-3 font-semibold">Name</th><th className="px-3 py-3 font-semibold">Parent</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 font-semibold">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {categories.map((category) => (
                <tr className="bg-white" key={category.id}>
                  <td className="px-3 py-3 font-medium">{category.name}</td>
                  <td className="px-3 py-3 text-[var(--muted)]">{category.parent_id ? names.get(category.parent_id) ?? "-" : "Top level"}</td>
                  <td className="px-3 py-3">{category.status}</td>
                  <td className="px-3 py-3">
                    {canEdit ? (
                      <ConfirmSubmit
                        action={toggleCategoryStatusAction}
                        fieldName="category_id"
                        fieldValue={category.id}
                        label={category.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        confirmation={category.status === "ACTIVE" ? `Deactivate ${category.name}? Attached products will remain and keep their category reference.` : `Activate ${category.name}?`}
                        className="text-xs font-semibold text-[var(--accent)] hover:underline"
                      />
                    ) : <span className="text-xs text-[var(--muted)]">View only</span>}
                  </td>
                </tr>
              ))}
              {categories.length === 0 && <tr><td className="px-3 py-8 text-center text-[var(--muted)]" colSpan={4}>No categories have been created.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}