# IMPLEMENTATION PLAN

## Rule
**Do not start the next phase until the current phase passes its acceptance criteria.**

## Phase 0 — Foundation
Repository, React/Next.js, Tailwind, Supabase, environment variables, linting, folder structure and error conventions.
Acceptance: local run, DB connection, production build and no committed secrets.

## Phase 1 — Database
Create business, users, roles, permissions, role_permissions, user_permissions and settings. Add migrations, constraints and RLS foundation.

## Phase 2 — Authentication
Login, logout, session, password recovery, account status. No public Manager signup.

## Phase 3 — Authorization
Granular module/action permissions. Server/database must reject unauthorized operations. UI only reflects permissions.

## Phase 4 — Products
Categories, products, variants, SKU, price, capacity, production and delivery timing, stock thresholds.

## Phase 5 — Customers
Customer CRUD, addresses, history and ledger foundation.

## Phase 6 — Materials/Inventory
Raw materials, inventory transactions, BOM, reservation and consumption.

## Phase 7 — Suppliers/Purchases
Supplier CRUD, purchase orders, receiving and stock update.

## Phase 8 — Orders
Multi-product orders, pricing, tax, discount, payment, due, priority, confirmation, cancellation and status history.

## Phase 9 — Scheduling Engine
Implement strict FIFO, product-specific capacity, working calendar, multi-day contiguous blocks, no-split rule, capacity exception and queue recalculation.

### Mandatory scheduler tests
1. Capacity 150; orders 100/100/100 → Day 1/2/3.
2. Capacity 150; order 200 → `CAPACITY_INSUFFICIENT`, no split.
3. Two-day production → one contiguous two-working-day block.
4. Cancel order → affected queue moves earlier.
5. Authorized priority change → queue recalculates.

## Phase 10 — Delivery Calculation
Production completion + configured delivery time + working calendar. Multi-product order delivery uses the required final completion date.

## Phase 11 — Production Tracking
Material ready, start, in production, QC, complete, delay detection and logs.

## Phase 12 — Delivery
Ready, packed, dispatched, in transit, delivered; optional tracking/vehicle/driver/proof.

## Phase 13 — Payments
Payment entry, methods, references, due calculation, customer ledger and audit.
Example: total ₹100,000, paid ₹30,000 → due ₹70,000, status Partial.

## Phase 14 — Sales/Expenses/Profit
Sales aggregates, expenses, cost calculations and profit reporting.

## Phase 15 — Dashboards
Admin and permission-aware Manager dashboards, KPIs, charts, queues and alerts.

## Phase 16 — Reports/Exports
Sales, production, inventory, payments, ledger, customer, expenses and profit. CSV/Excel/PDF exports.

## Phase 17 — Notifications
In-app notifications for delays, low stock, payment dues, delivery dues and schedule changes. WhatsApp/SMS can be added later.

## Phase 18 — Security/Audit
Full RLS review, server authorization, input validation, secret handling, upload security, audit logs and rate limits.

## Phase 19 — Testing
Unit + integration + E2E. Test both authorized and unauthorized actions. Test scheduler edge cases extensively.

## Phase 20 — Deployment
Production Supabase, migrations, Vercel, environment variables, domain, backups, monitoring and error logging.

## Final acceptance flow
```text
Login
→ Product
→ Customer
→ Order
→ Confirm
→ Automatic Schedule
→ Production
→ Completion
→ Delivery
→ Payment
→ Ledger
→ Dashboard
→ Reports
```

## Future extensions
Multi-branch, WhatsApp/SMS, barcode/QR, machine/IoT integration, forecasting, customer portal, supplier portal, mobile app and advanced analytics.
