"use server";

import { type SupplierFormValues } from "@/types/supplier";

export const EMPTY_SUPPLIER_FORM: SupplierFormValues = {
  name: "",
  phone: "",
  email: "",
  address: "",
  gst_number: "",
};

export function supplierToFormValues(supplier: {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gst_number: string | null;
}): SupplierFormValues {
  return {
    name: supplier.name,
    phone: supplier.phone ?? "",
    email: supplier.email ?? "",
    address: supplier.address ?? "",
    gst_number: supplier.gst_number ?? "",
  };
}