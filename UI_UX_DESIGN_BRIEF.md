# UI/UX DESIGN BRIEF

## Design direction
Professional B2B manufacturing operations UI: clean, fast, information-dense but readable, responsive and easy for non-technical staff.

## Navigation
Dashboard, Orders, Production, Products, Inventory, Customers, Suppliers, Purchases, Payments, Delivery, Reports, Expenses, Notifications, Settings, Audit Logs. Only show accessible modules.

## Admin dashboard
KPI cards: Sales, Orders, Production, Outstanding, Inventory Alerts, Delayed Orders.
Sections: sales trend, order pipeline, production queue, capacity utilization, collections and low-stock alerts.

## Manager dashboard
Permission-aware operational dashboard. Prioritize today's production, pending orders, delays, delivery due and customer dues.

## Product UI
List: search, category, status, SKU, price, daily capacity, production time, stock.
Form sections: Basic, Pricing, Production, Delivery, Inventory, BOM.

## Order UI
List columns: Order No, Customer, Date, Amount, Paid, Due, Priority, Production Status, Delivery Date, Overall Status.
Detail page: customer, items, pricing, payment, production schedule, delivery, timeline and audit.

## Production Queue UI
Show queue position, order, product, quantity, capacity, planned start/completion, delivery date, priority and status. Do not visually represent an automatically split order.

## Inventory UI
Available, Reserved, Current Stock, Minimum Stock, Reorder Alert and transaction history.

## Customer UI
Contact, addresses, orders, sales, payments, due and ledger.

## Permissions UI
Matrix:
`Module | View | Create | Edit | Delete | Special Actions`
Special actions include price/capacity/timing changes, cancellation, priority change, inventory adjustment, payment deletion and report export.

## UX rules
- Inline validation.
- Required fields clearly marked.
- Prevent duplicate submissions.
- Preserve entered data after validation errors.
- Confirmation dialogs for destructive/sensitive actions.
- Explain consequences before confirmation.
- Clear empty states.
- Search/filter/pagination on large datasets.
- Toasts for success/failure.

## Mobile
Manager workflows optimized for mobile: large touch targets, sticky actions, compact tables/cards, quick order creation, quick payment entry and production status updates.

## Accessibility
Keyboard navigation, visible focus, semantic labels, accessible dialogs, adequate contrast and associated form errors.
