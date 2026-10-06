import Link from "next/link";
import ConfirmSubmit from "@/components/confirm-submit";
import { requireAuthContext, requirePermission } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions/authorization";
import { setRawMaterialStatusAction } from "@/lib/materials/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RawMaterial } from "@/types/material";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const messages: Record<string, string> = {
  material_created: "Raw material created.",
  material_updated: "Raw material updated.",
  material_deactivated: "Raw material deactivated; stock and transaction history are retained.",
  material_activated: "Raw material activated.",
  stock_added: "Stock entry recorded.",
  stock_adjusted: "Stock adjustment recorded.",
  forbidden: "You do not have permission for that action.",
  duplicate_code: "That raw-material code is already in use in this business.",
  material_not_found: "That raw material is not available in this business.",
  status_failed: "Material status could not be changed.",
  auth_unconfigured: "Supabase is not configured for this environment.",
};

function safeSearch(value: string | undefined): string {
  return (value ?? "").replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function quantity(value: string | number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(Number(value));
}

export default async function RawMaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; notice?: string; error?: string }>;
}) {
  const context = await requireAuthContext();
  await requirePermission(context, "raw_materials.view");
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <p className="text-sm text-[var(--signal)]">Supabase is not configured.</p>;

  const search = safeSearch(params.q);
  const pageValue = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const status = params.status === "ACTIVE" || params.status === "INACTIVE" ? params.status : "ALL";
  const canCreate = hasPermission({ permissions: context.permissions }, "raw_materials.create");
  const canEdit = hasPermission({ permissions: context.permissions }, "raw_materials.edit");
  const canDeactivate = hasPermission({ permissions: context.permissions }, "raw_materials.delete");

  let query = supabase
    .from("raw_materials")
    .select("*", { count: "exact" })
    .eq("business_id", context.user.business_id)
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (search) query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
  if (status !== "ALL") query = query.eq("status", status);
  const { data, error, count } = await query;
  if (error) return <p className="text-sm text-[var(--signal)]">Raw materials could not be loaded.</p>;

  const materials = (data ?? []) as RawMaterial[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const message = params.notice ? messages[params.notice] : params.error ? messages[params.error] : null;
  const pageHref = (target: number) => {
    const queryParams = new URLSearchParams();
    if (search) queryParams.set("q", search);
    if (status !== "ALL") queryParams.set("status", status);
    queryParams.set("page", String(target));
    return `/raw-materials?${queryParams.toString()}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--accent)]">Materials</p>
          <h1 className="mt-2 text-3xl font-semibold">Raw materials</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Material catalog, stock thresholds, and current quantities.</p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-sm border border-[var(--line)] px-3 py-2 text-sm font-medium hover:bg-white" href="/inventory">Inventory</Link>
          {canCreate && <Link className="rounded-sm bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]" href="/raw-materials/new">New material</Link>}
        </div>
      </div>

      {message && <p className={`mt-5 border-l-2 px-3 py-2 text-sm ${params.error ? "border-[var(--signal)] bg-[#fbf0ec] text-[var(--signal)]" : "border-[var(--accent)] bg-[#eef5f0] text-[var(--accent-strong)]"}`} role="status">{message}</p>}

      <form action="/raw-materials" className="mt-6 grid gap-3 border-b border-[var(--line)] pb-6 sm:grid-cols-[minmax(220px,1fr)_180px_auto]">
        <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted)]">
          Search name or code
          <input className="min-h-10 rounded-sm border border-[var(--line)] bg-white px-3 text-sm font-normal text-[var(--foreground)] outline-none focus:border-[var(--accent)]" maxLength={80} name="q" defaultValue={search} />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted)]">
          Status
          <select className="min-h-10 rounded-sm border border-[var(--line)] bg-white px-3 text-sm font-normal text-[var(--foreground)]" name="status" defaultValue={status}>
            <option value="ALL">All</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <div className="flex items-end"><button className="min-h-10 w-full rounded-sm border border-[var(--line)] bg-white px-4 text-sm font-semibold hover:bg-[#eaf0eb]" type="submit">Apply filters</button></div>
      </form>

      <div className="mt-5 flex justify-between text-sm text-[var(--muted)]"><p>{count ?? 0} material{count === 1 ? "" : "s"}</p><p>Page {page} of {pages}</p></div>
      <div className="mt-3 overflow-x-auto border-y border-[var(--line)]">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="bg-[#eaf0eb] text-xs uppercase text-[var(--muted)]"><tr>
            <th className="px-3 py-3 font-semibold">Code</th><th className="px-3 py-3 font-semibold">Name</th><th className="px-3 py-3 font-semibold">Unit</th><th className="px-3 py-3 font-semibold">Current stock</th><th className="px-3 py-3 font-semibold">Minimum stock</th><th className="px-3 py-3 font-semibold">Reorder level</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 font-semibold">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {materials.map((material) => {
              const lowStock = Number(material.current_stock) <= Number(material.reorder_level);
              return (
                <tr className="bg-white" key={material.id}>
                  <td className="px-3 py-3 font-mono text-xs">{material.code || "-"}</td>
                  <td className="px-3 py-3"><Link className="font-semibold hover:text-[var(--accent)]" href={`/raw-materials/${material.id}`}>{material.name}</Link>{lowStock && <span className="ml-2 border border-[#e6c5b9] bg-[#fbf0ec] px-2 py-1 text-[10px] font-semibold text-[var(--signal)]">Low stock</span>}</td>
                  <td className="px-3 py-3">{material.unit}</td>
                  <td className="px-3 py-3 tabular-nums">{quantity(material.current_stock)}</td>
                  <td className="px-3 py-3 tabular-nums">{quantity(material.min_stock)}</td>
                  <td className="px-3 py-3 tabular-nums">{quantity(material.reorder_level)}</td>
                  <td className="px-3 py-3">{material.status}</td>
                  <td className="px-3 py-3"><div className="flex items-center gap-3">
                    <Link className="text-xs font-semibold text-[var(--accent)] hover:underline" href={`/raw-materials/${material.id}`}>View</Link>
                    {canEdit && <Link className="text-xs font-semibold text-[var(--accent)] hover:underline" href={`/raw-materials/${material.id}/edit`}>Edit</Link>}
                    {material.status === "ACTIVE" && canDeactivate && <ConfirmSubmit action={setRawMaterialStatusAction} fieldName="raw_material_id" fieldValue={material.id} hiddenFields={{ status: "INACTIVE" }} label="Deactivate" confirmation={`Deactivate ${material.name}? Stock and transaction history remain recorded.`} className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)]" />}
                    {material.status === "INACTIVE" && canEdit && <ConfirmSubmit action={setRawMaterialStatusAction} fieldName="raw_material_id" fieldValue={material.id} hiddenFields={{ status: "ACTIVE" }} label="Activate" confirmation={`Activate ${material.name}?`} className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)]" />}
                  </div></td>
                </tr>
              );
            })}
            {materials.length === 0 && <tr><td className="px-3 py-12 text-center text-[var(--muted)]" colSpan={8}>No raw materials match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        {page > 1 && <Link className="rounded-sm border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium" href={pageHref(page - 1)}>Previous</Link>}
        {page < pages && <Link className="rounded-sm border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium" href={pageHref(page + 1)}>Next</Link>}
      </div>
    </div>
  );
}