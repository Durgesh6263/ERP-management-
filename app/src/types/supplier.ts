export type SupplierStatus = "ACTIVE" | "INACTIVE";

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gst_number: string | null;
  status: SupplierStatus;
  created_at: string;
  updated_at: string;
}

export interface SupplierListItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  gst_number: string | null;
  status: SupplierStatus;
  created_at: string;
}

export interface SupplierFormValues {
  name: string;
  phone: string;
  email: string;
  address: string;
  gst_number: string;
}

export type PurchaseOrderStatus = "DRAFT" | "ORDERED" | "PARTIAL" | "RECEIVED" | "CANCELLED";

export interface PurchaseOrder {
  id: string;
  business_id: string;
  supplier_id: string;
  po_number: string;
  order_date: string;
  expected_date: string | null;
  status: PurchaseOrderStatus;
  subtotal: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderListItem {
  id: string;
  po_number: string;
  order_date: string;
  expected_date: string | null;
  status: PurchaseOrderStatus;
  subtotal: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  supplier_id: string;
  suppliers: { name: string } | null;
}

export interface PurchaseOrderItem {
  id: string;
  business_id: string;
  purchase_order_id: string;
  raw_material_id: string;
  ordered_quantity: string | number;
  received_quantity: string | number;
  unit_cost: string | number;
  tax_rate: string | number;
  line_total: string | number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItemWithMaterial extends PurchaseOrderItem {
  raw_material_code: string | null;
  raw_material_name: string;
  raw_material_unit: string;
  remaining_quantity: string | number;
}

export interface PurchaseReceipt {
  id: string;
  business_id: string;
  purchase_order_id: string;
  raw_material_id: string;
  received_quantity: string | number;
  unit_cost: string | number;
  tax_rate: string | number;
  notes: string | null;
  received_by: string;
  received_at: string;
  created_at: string;
}

export interface PurchaseOrderFormValues {
  supplier_id: string;
  po_number: string;
  order_date: string;
  expected_date: string;
  notes: string;
  items: PurchaseOrderItemFormValues[];
}

export interface PurchaseOrderItemFormValues {
  raw_material_id: string;
  ordered_quantity: string;
  unit_cost: string;
  tax_rate: string;
}

export interface ReceiveItemFormValues {
  purchase_order_item_id: string;
  received_quantity: string;
  unit_cost: string;
  tax_rate: string;
  notes: string;
}

export interface ManualStockFormValues {
  raw_material_id: string;
  quantity: string;
  reason: string;
  reference: string;
  notes: string;
}

export const MANUAL_STOCK_REASONS = [
  "Opening Stock",
  "Direct Receipt",
  "Initial Setup",
  "Stock Correction",
  "Other",
] as const;