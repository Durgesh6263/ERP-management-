import { redirect } from "next/navigation";
import RawMaterialForm from "@/components/materials/raw-material-form";
import { getAuthContext } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions/authorization";
import { EMPTY_RAW_MATERIAL_FORM } from "@/lib/materials/form-values";

export const dynamic = "force-dynamic";

export default async function NewRawMaterialPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login?error=account_unavailable");
  if (!hasPermission({ permissions: context.permissions }, "raw_materials.view")) redirect("/");
  if (!hasPermission({ permissions: context.permissions }, "raw_materials.create")) redirect("/raw-materials");
  return (
    <div>
      <div className="mb-8 border-b border-[var(--line)] pb-5"><p className="text-xs font-semibold uppercase text-[var(--accent)]">Materials</p><h1 className="mt-2 text-3xl font-semibold">New raw material</h1></div>
      <RawMaterialForm initialValues={EMPTY_RAW_MATERIAL_FORM} />
    </div>
  );
}