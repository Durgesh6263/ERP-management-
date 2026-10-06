"use client";

import { useActionState, useState } from "react";
import { calculateBomRequirementsAction } from "@/lib/bom/actions";

const errors: Record<string, string> = {
  invalid_order_quantity: "Enter a positive product quantity.",
  forbidden: "You do not have permission to view BOM requirements.",
  auth_unconfigured: "Supabase is not configured.",
  calculation_failed: "Requirements could not be calculated.",
  no_active_bom: "There is no active BOM for this product.",
};

export default function BomCalculator({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState(calculateBomRequirementsAction, {});
  const [quantity, setQuantity] = useState("100");

  return (
    <div className="mt-6 border-t border-[var(--line)] pt-5">
      <h3 className="text-sm font-semibold">Requirement calculator</h3>
      <p className="mt-1 text-xs text-[var(--muted)]">Calculates material requirements from this active BOM. It does not create an order or consume stock.</p>
      <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
        <input type="hidden" name="product_id" value={productId} />
        <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
          Product quantity
          <input className="min-h-10 w-36 rounded-sm border border-[var(--line)] bg-white px-3 text-sm font-normal text-[var(--foreground)]" min="0.001" name="order_quantity" onChange={(event) => setQuantity(event.target.value)} required step="0.001" type="number" value={quantity} />
        </label>
        <button className="min-h-10 rounded-sm border border-[var(--line)] bg-white px-4 text-sm font-semibold hover:bg-[#eaf0eb] disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Calculating..." : "Calculate"}
        </button>
      </form>
      {state.error && <p className="mt-3 text-sm text-[var(--signal)]" role="alert">{errors[state.error] ?? "Calculation failed."}</p>}
      {state.requirements && (
        <div className="mt-4 border-y border-[var(--line)]">
          {state.requirements.map((line) => (
            <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] py-2 last:border-b-0" key={line.raw_material_id}>
              <span className="text-sm">{line.name}</span>
              <span className="text-sm font-semibold tabular-nums">{line.required_quantity} {line.unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}