"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveRawMaterialAction } from "@/lib/materials/actions";
import { RAW_MATERIAL_UNITS, type RawMaterialFormValues } from "@/types/material";

const inputClass = "min-h-10 w-full rounded-sm border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--accent)]";
const labelClass = "grid gap-1.5 text-sm font-medium";
const errors: Record<string, string> = {
  invalid_name: "Enter a raw-material name of 1 to 160 characters.",
  invalid_code: "Code must be 64 characters or fewer.",
  invalid_unit: "Choose a supported material unit.",
  invalid_min_stock: "Minimum stock must be non-negative, with up to three decimals.",
  invalid_reorder_level: "Reorder level must be non-negative, with up to three decimals.",
  invalid_purchase_price: "Purchase price must be non-negative, with up to two decimals.",
  duplicate_code: "That material code is already used in this business.",
  material_not_found: "That raw material is not available in this business.",
  forbidden: "You do not have permission to change raw materials.",
  auth_unconfigured: "Supabase is not configured for this environment.",
  save_failed: "The raw material could not be saved.",
};

export default function RawMaterialForm({
  materialId,
  initialValues,
}: {
  materialId?: string;
  initialValues: RawMaterialFormValues;
}) {
  const [state, formAction, pending] = useActionState(saveRawMaterialAction, {});
  const [values, setValues] = useState(initialValues);
  const field = (name: keyof RawMaterialFormValues, value: string) =>
    setValues((current) => ({ ...current, [name]: value }));

  return (
    <form action={formAction} className="space-y-8">
      {materialId && <input type="hidden" name="raw_material_id" value={materialId} />}
      {state.error && <p className="border-l-2 border-[var(--signal)] bg-[#fbf0ec] px-3 py-2 text-sm text-[var(--signal)]" role="alert">{errors[state.error] ?? "The material could not be saved."}</p>}
      <fieldset className="grid gap-5 border-t border-[var(--line)] pt-5 md:grid-cols-2">
        <legend className="px-1 text-lg font-semibold">Material details</legend>
        <label className={labelClass}>
          Name <span className="text-[var(--signal)]">*</span>
          <input className={inputClass} maxLength={160} name="name" onChange={(event) => field("name", event.target.value)} required value={values.name} />
        </label>
        <label className={labelClass}>
          Code
          <input className={inputClass} maxLength={64} name="code" onChange={(event) => field("code", event.target.value)} value={values.code} />
          <span className="text-xs font-normal text-[var(--muted)]">Optional; normalized to uppercase and unique in this business.</span>
        </label>
        <label className={labelClass}>
          Unit <span className="text-[var(--signal)]">*</span>
          <select className={inputClass} name="unit" onChange={(event) => field("unit", event.target.value)} value={values.unit}>
            {RAW_MATERIAL_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
          </select>
        </label>
      </fieldset>
      <fieldset className="grid gap-5 border-t border-[var(--line)] pt-5 md:grid-cols-2">
        <legend className="px-1 text-lg font-semibold">Stock thresholds and cost</legend>
        <label className={labelClass}>
          Minimum stock
          <input className={inputClass} min="0" name="min_stock" onChange={(event) => field("min_stock", event.target.value)} required step="0.001" type="number" value={values.min_stock} />
        </label>
        <label className={labelClass}>
          Reorder level
          <input className={inputClass} min="0" name="reorder_level" onChange={(event) => field("reorder_level", event.target.value)} required step="0.001" type="number" value={values.reorder_level} />
        </label>
        <label className={labelClass}>
          Purchase price
          <input className={inputClass} min="0" name="purchase_price" onChange={(event) => field("purchase_price", event.target.value)} required step="0.01" type="number" value={values.purchase_price} />
        </label>
        <p className="self-end text-xs leading-5 text-[var(--muted)]">Current stock is changed only through Inventory so every movement is recorded.</p>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-5">
        <button className="min-h-10 rounded-sm bg-[var(--accent)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Saving..." : materialId ? "Save changes" : "Create raw material"}
        </button>
        <Link className="rounded-sm px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:bg-[#eaf0eb]" href={materialId ? `/raw-materials/${materialId}` : "/raw-materials"}>Cancel</Link>
      </div>
    </form>
  );
}