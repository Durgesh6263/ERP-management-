import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions/authorization";
import { redirect } from "next/navigation";
import { ManualStockForm } from "@/components/inventory/manual-stock-form";

export default async function ManualStockPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login?error=account_unavailable");
  if (!hasPermission({ permissions: context.permissions }, "inventory.add_stock")) redirect("/inventory?error=forbidden");

  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/inventory?error=auth_unconfigured");

  const { data: materials } = await supabase
    .from("raw_materials")
    .select("id, code, name, unit, current_stock")
    .eq("business_id", context.user.business_id)
    .eq("status", "ACTIVE")
    .order("name");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Manual Stock Addition</h1>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <ManualStockForm materials={materials ?? []} />
      </div>
    </div>
  );
}