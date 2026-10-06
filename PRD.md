# PRD — Manufacturing Management System

## 1. Objective
Create one system to manage manufacturing operations, sales, customers, inventory, production scheduling, delivery and collections.

## 2. Users
### Super Admin
Full control over business, users, permissions, configuration and sensitive actions.
### Admin
Operational/business administration according to assigned access.
### Manager
Created by Admin; no public signup. Access is granted action-by-action.

## 3. Product Management
Product: name, SKU, category, description, images, unit, price, tax, discount, daily capacity, production unit, min/max production time, setup time, min/max delivery time, delivery method, minimum stock, reorder level, active status.
Variants may have separate SKU, price, stock, capacity and timing.

## 4. Raw Materials / BOM
Track material code, unit, stock, minimum/reorder levels, supplier and purchase price. BOM defines material consumption per product unit. Required material = order quantity × BOM quantity.

## 5. Customers
Name/company, phone, email, GST, addresses, payment terms, credit limit, order history, sales, payments, due and ledger.

## 6. Orders
Order number, customer, items, quantities, prices, discount, tax, total, payment, due, priority, production status, delivery status and notes. Support multiple products in one order.

## 7. Scheduling
Inputs: product capacity, order quantity, existing queue, priority, production duration, material availability and working calendar.

### Mandatory scheduler rules
1. Confirmed order enters queue.
2. Strict FIFO by default.
3. Priority change is allowed only with permission.
4. Find earliest working slot.
5. Entire order item must fit the configured capacity rule.
6. Never automatically split an order.
7. Multi-day production reserves a contiguous block.
8. Calculate production completion.
9. Add delivery time.
10. Save queue position and dates.
11. Recalculate affected orders after cancellation/priority/capacity/calendar changes.

Example: capacity 150, orders 100/100/100 → Day 1/Day 2/Day 3. Never 50+50 splitting.

## 8. Production
Statuses: Scheduled → Material Ready → Production Started → In Production → Quality Check → Production Completed → Ready for Dispatch.
Track planned/actual dates, quantity, assigned team and logs. Detect delays.

## 9. Inventory
Separate raw material and finished goods. Track available, reserved, stock in/out, production consumption/output, dispatch, returns and adjustments. Every movement creates a transaction.

## 10. Delivery
Not Ready → Ready → Packed → Dispatched → In Transit → Delivered. Optional tracking number, vehicle, driver and proof.

## 11. Payments
`Due = Order Total - Total Payments`. Statuses: Unpaid, Partial, Paid, Overdue. Maintain customer ledger. Sensitive payment edits/deletions are permission-controlled and audited.

## 12. Dashboard / Reports
KPIs: sales, orders, pending, production, ready, delivered, received, outstanding, capacity usage, delayed orders and inventory alerts. Reports cover sales, products, customers, production, capacity, inventory, payments, ledger, expenses and profit. Export CSV/Excel/PDF.

## 13. Permissions
Products: view/create/edit/delete/change price/change capacity/change production time/change delivery time.
Inventory: view/add/edit/adjust/history.
Customers: view/create/edit/delete.
Orders: view/create/edit/cancel/change priority/approve.
Production: view/start/update/complete.
Payments: view/add/edit/delete.
Reports: view/export.

## 14. Audit
Record actor, action, entity, timestamp, old values and new values for sensitive actions.

## 15. Acceptance principle
A feature is complete only when its UI, server logic, database constraints/RLS, error handling, audit behavior and tests are complete.
