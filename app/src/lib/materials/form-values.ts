import type { RawMaterial, RawMaterialFormValues } from "@/types/material";

export const EMPTY_RAW_MATERIAL_FORM: RawMaterialFormValues = {
  code: "",
  name: "",
  unit: "kg",
  min_stock: "0",
  reorder_level: "0",
  purchase_price: "0",
};

export function rawMaterialToFormValues(material?: RawMaterial): RawMaterialFormValues {
  if (!material) return { ...EMPTY_RAW_MATERIAL_FORM };
  return {
    code: material.code ?? "",
    name: material.name,
    unit: material.unit,
    min_stock: String(material.min_stock),
    reorder_level: String(material.reorder_level),
    purchase_price: String(material.purchase_price),
  };
}