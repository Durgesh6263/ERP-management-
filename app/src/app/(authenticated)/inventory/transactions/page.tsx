import Link from "next/link";
import { requireAuthContext, requirePermission } from "@/lib/auth/context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { InventoryTransaction, RawMaterial } from "@/types/material";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;

export default async function InventoryTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; material?: string }>;
}) {
  const context = await requireAuthContext();
  await requirePermission(context, "inventory.view_history");
  await requirePermission(context, "inventory.view");
  await requirePermission(context, "raw_materials.view");
  const params = await searchParams;
  const pageValue = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <p className="text-sm text-[var(--signal)]">Supabase is not configured.</p>;

  let query = supabase
    .from("inventory_transactions")
    .select("*", { count: "exact" })
    .eq("business_id", context.user.business_id)
    .eq("item_type", "raw_material")
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (params.material) query = query.eq("item_id", params.material);
  const { data, error, count } = await query;
  if (error) return <p className="text-sm text-[var(--signal)]">Transaction history could not be loaded.</p>;

  const transactions = (data ?? []) as InventoryTransaction[];
  const materialIds = [...new Set(transactions.map((transaction) => transaction.item_id))];
  const { data: materialData, error: materialError } = materialIds.length
    ? await supabase.from("raw_materials").select("id, name, code, unit").eq("business_id", context.user.business_id).in("id", materialIds)
    : { data: [], error: null };
  if (materialError) return <p className="text-sm text-[var(--signal)]">Material names could not be loaded.</p>;
  const materials = new Map(((materialData ?? []) as Pick<RawMaterial, "id" | "name" | "code" | "unit">[]).map((material) => [material.id, material]));
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const materialFilter = params.material ? `&material=${encodeURIComponent(params.material)}` : "";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div><Link className="text-sm font-medium text-[var(--accent)] hover:underline" href="/inventory">Inventory</Link><h1 className="mt-2 text-3xl font-semibold">Transaction history</h1><p className="mt-2 text-sm text-[var(--muted)]">Recorded raw-material stock movements and adjustments.</p></div>
        <p className="text-sm text-[var(--muted)]">{count ?? 0} transaction{count === 1 ? "" : "s"}</p>
      </div>
      <div className="mt-5 overflow-x-auto border-y border-[var(--line)]">
        <table className="w-full min-w-[780px] border-collapse text-left text-sm">
          <thead className="bg-[#eaf0eb] text-xs uppercase text-[var(--muted)]"><tr>
            <th className="px-3 py-3 font-semibold">Date</th><th className="px-3 py-3 font-semibold">Material</th><th className="px-3 py-3 font-semibold">Type</th><th className="px-3 py-3 font-semibold">Quantity</th><th className="px-3 py-3 font-semibold">Reason / notes</th>
          </tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {transactions.map((transaction) => {
              const material = materials.get(transaction.item_id);
              const quantity = Number(transaction.quantity);
              return (
                <tr className="bg-white" key={transaction.id}>
                  <td className="px-3 py-3">{new Date(transaction.created_at).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-3">{material ? <Link className="font-medium hover:text-[var(--accent)]" href={`/raw-materials/${material.id}`}>{material.name}</Link> : "Unknown material"}<p className="font-mono text-xs text-[var(--muted)]">{material?.code || "-"}</p></td>
                  <td className="px-3 py-3">{transaction.transaction_type.replaceAll("_", " ")}</td>
                  <td className="px-3 py-3 tabular-nums">{quantity > 0 ? "+" : ""}{transaction.quantity} {material?.unit ?? ""}</td>
                  <td className="px-3 py-3 text-[var(--muted)]">{transaction.notes || "-"}</td>
                </tr>
              );
            })}
            {transactions.length === 0 && <tr><td className="px-3 py-10 text-center text-[var(--muted)]" colSpan={5}>No transactions recorded.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        {page > 1 && <Link className="rounded-sm border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium" href={`/inventory/transactions?page=${page - 1}${materialFilter}`}>Previous</Link>}
        {page < pages && <Link className="rounded-sm border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium" href={`/inventory/transactions?page=${page + 1}${materialFilter}`}>Next</Link>}
      </div>
    </div>
  );
}