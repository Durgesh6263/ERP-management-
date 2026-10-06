import { notFound, redirect } from "next/navigation";
import RawMaterialForm from "@/components/materials/raw-material-form";
import { getAuthContext } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions/authorization";
import { rawMaterialToFormValues } from "@/lib/materials/form-values";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RawMaterial } from "@/types/material";

export const dynamic = "force-dynamic";

export default async function EditRawMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await getAuthContext();
  if (!context) redirect("/login?error=account_unavailable");
  if (!hasPermission({ permissions: context.permissions }, "raw_materials.view")) redirect("/");
  if (!hasPermission({ permissions: context.permissions }, "raw_materials.edit")) redirect("/raw-materials");
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <p className="text-sm text-[var(--signal)]">Supabase is not configured.</p>;
  const { data, error } = await supabase.from("raw_materials").select("*").eq("id", id).eq("business_id", context.user.business_id).maybeSingle();
  if (error || !data) notFound();
  return (
    <div>
      <div className="mb-8 border-b border-[var(--line)] pb-5"><p className="text-xs font-semibold uppercase text-[var(--accent)]">Materials</p><h1 className="mt-2 text-3xl font-semibold">Edit {data.name}</h1></div>
      <RawMaterialForm materialId={id} initialValues={rawMaterialToFormValues(data as RawMaterial)} />
    </div>
  );
}