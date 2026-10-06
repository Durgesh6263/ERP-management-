"use client";

import { useActionState, useState } from "react";
import { createCategoryAction } from "@/lib/products/actions";

const errors: Record<string, string> = {
  auth_unconfigured: "Supabase is not configured for this environment.",
  invalid_category_name: "Enter a category name of 1 to 80 characters.",
  invalid_category_parent: "Choose an active top-level parent category.",
  duplicate_category: "A category with that name already exists in this business.",
  category_create_failed: "The category could not be created.",
};

export default function CategoryForm({
  parentOptions,
}: {
  parentOptions: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createCategoryAction, {});
  const [name, setName] = useState(state.name ?? "");
  const [parentId, setParentId] = useState(state.parent_id ?? "");

  return (
    <form action={formAction} className="grid gap-4 border-y border-[var(--line)] py-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
      {state.error && (
        <p className="border-l-2 border-[var(--signal)] bg-[#fbf0ec] px-3 py-2 text-sm text-[var(--signal)] md:col-span-3" role="alert">
          {errors[state.error] ?? "The category could not be saved."}
        </p>
      )}
      <label className="grid gap-1.5 text-sm font-medium">
        Category name <span className="text-[var(--signal)]">*</span>
        <input className="min-h-10 rounded-sm border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--accent)]" autoComplete="off" maxLength={80} name="name" onChange={(event) => setName(event.target.value)} required value={name} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Parent category
        <select className="min-h-10 rounded-sm border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--accent)]" name="parent_id" onChange={(event) => setParentId(event.target.value)} value={parentId}>
          <option value="">None (top-level category)</option>
          {parentOptions.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}
        </select>
      </label>
      <button className="min-h-10 rounded-sm bg-[var(--accent)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Saving..." : parentId ? "Add subcategory" : "Add category"}
      </button>
    </form>
  );
}