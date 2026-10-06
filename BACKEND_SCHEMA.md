# BACKEND SCHEMA — PostgreSQL

All business tables should include `business_id` where applicable for tenant isolation. Use UUID primary keys, foreign keys, timestamps and RLS.

## Identity
### users
`id, business_id, name, email, phone, status, created_at, updated_at`
### roles
`id, business_id, name, description`
### permissions
`id, module, action, description`
### role_permissions
`role_id, permission_id`
### user_permissions
`user_id, permission_id, allowed`

## Business
### businesses
`id, name, legal_name, gst_number, address, phone, email, currency, timezone, created_at`
### business_settings
`id, business_id, key, value`

## Products
### categories
`id, business_id, parent_id, name, status, created_at, updated_at`
### products
`id, business_id, category_id, subcategory_id, name, sku, description, unit, selling_price, tax_rate, daily_capacity, production_unit, production_min_days, production_max_days, setup_minutes, delivery_min_days, delivery_max_days, min_stock, reorder_level, active, created_at, updated_at`
### product_variants
`id, business_id, product_id, sku, name, price, daily_capacity, active, created_at, updated_at`

Product and variant prices use PostgreSQL `NUMERIC`; product and category deletion is not exposed. Deactivate records to preserve existing references. Product units are controlled (`Piece`, `Bundle`, `Box`, `Kg`, `Meter`, `Set`). Product variants are configuration-only; stock and inventory transactions belong to a later phase.

## Materials
### raw_materials
`id, business_id, code, name, unit, current_stock, min_stock, reorder_level, purchase_price, status, created_at, updated_at`
### product_bom
`id, business_id, product_id, version, active, created_at, updated_at`
### bom_items
`id, business_id, bom_id, raw_material_id, quantity_per_unit, created_at, updated_at`

## Suppliers/Purchases
### suppliers
`id, business_id, name, phone, email, address, gst_number, payment_terms, outstanding`
### purchase_orders
`id, business_id, supplier_id, po_number, order_date, status, total, created_by`
### purchase_order_items
`id, purchase_order_id, raw_material_id, quantity, unit_price, total`

## Inventory
### inventory
`id, business_id, item_type, item_id, current_stock, reserved_stock, available_stock`
### inventory_transactions
`id, business_id, item_type, item_id, transaction_type, quantity, reference_type, reference_id, notes, created_by, created_at`

Raw-material stock is mirrored in `inventory`; every stock-in or adjustment updates both records, writes one `inventory_transactions` row, and creates an audit event transactionally. Client roles cannot directly write stock. BOM material rows and products/raw materials must share a business.

## Customers
### customers
`id, business_id, name, company_name, phone, email, gst_number, payment_terms, credit_limit, status`
### customer_addresses
`id, customer_id, address_type, address, city, state, postal_code, created_at, updated_at`
### customer_ledger
`id, customer_id, reference_type, reference_id, debit, credit, balance, created_at`

## Orders
### orders
`id, business_id, customer_id, order_number, order_date, status, priority, subtotal, discount, tax, total, paid, due, notes, created_by, confirmed_at, created_at, updated_at`
### order_items
`id, order_id, product_id, variant_id, quantity, unit_price, discount, tax, total, production_status, production_start_date, production_completion_date, expected_delivery_date`
### order_status_history
`id, order_id, old_status, new_status, changed_by, changed_at, note`

## Production
### production_orders
`id, business_id, order_item_id, product_id, quantity, status, priority, queue_position, planned_start_date, planned_completion_date, actual_start_date, actual_completion_date, created_at`
### production_schedules
`id, production_order_id, schedule_date, sequence, reserved_capacity, status`
### production_logs
`id, production_order_id, status, quantity, logged_by, logged_at, notes`
### production_materials
`id, production_order_id, raw_material_id, planned_quantity, consumed_quantity`

`production_schedules` may contain multiple dates for a multi-day production block. These rows represent one contiguous block and must not be interpreted as quantity splitting.

## Delivery
### deliveries
`id, business_id, order_id, status, expected_date, dispatched_at, delivered_at, tracking_number, vehicle, driver, proof_url`
### delivery_items
`id, delivery_id, order_item_id, quantity`

## Payments
### payments
`id, business_id, customer_id, order_id, amount, payment_method, reference_number, payment_date, notes, created_by, created_at`
### payment_transactions
`id, payment_id, transaction_type, amount, reference_type, reference_id, created_at`

## Other
### expenses
`id, business_id, category, amount, expense_date, description, created_by`
### notifications
`id, user_id, type, title, message, read_at, created_at`
### working_days
`id, business_id, date, is_working_day`
### holidays
`id, business_id, date, name`
### audit_logs
`id, business_id, user_id, action, entity_type, entity_id, old_data, new_data, created_at`

## Relationships
```text
Business
├── Users / Roles / Permissions
├── Products ── BOM ── Raw Materials
├── Customers ── Orders ── Order Items ── Production Orders ── Schedules
├── Suppliers ── Purchase Orders
├── Inventory / Payments / Deliveries / Expenses
└── Audit Logs
```

## Required indexes
Orders by business/date/status; order_items by order; production by product/date/status; schedules by date; inventory by item; payments by customer/order; audit logs by entity.
