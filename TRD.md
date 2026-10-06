# TRD — Technical Requirements

## Architecture
`Next.js/React → Server/API layer → Supabase/PostgreSQL`

Business-critical scheduling, permissions, payments and inventory must execute in trusted server/database layers.

## Core services
- Auth Service: authentication/session/password recovery.
- Authorization Service: role + granular permission checks.
- Scheduling Service: FIFO, priority, capacity, calendar, contiguous multi-day blocks, delivery calculation and recalculation.
- Inventory Service: reservations, consumption, output, dispatch, returns, adjustments.
- Payment Service: payments, allocation, due and ledger.
- Audit Service: immutable activity history for sensitive operations.

## Scheduling algorithm
```text
Confirmed order
→ validate product/quantity
→ validate capacity
→ validate materials
→ load product queue
→ apply FIFO / authorized priority
→ find earliest working slot
→ verify complete order fits
→ reserve one production block
→ calculate completion
→ calculate delivery
→ persist schedule
→ recalculate affected queue when required
```

If `quantity > daily_capacity`, return `CAPACITY_INSUFFICIENT`; never silently split.

For production duration > 1 day, reserve consecutive working days and skip holidays/non-working days.

## Transactional operations
### Confirm order
Order confirmation + reservation + schedule + audit should be atomic where practical.
### Payment
Payment insert + ledger update + due recalculation + audit.
### Inventory adjustment
Transaction insert + stock update + audit.

## Authorization
Frontend checks are UX only. API/server/database must reject unauthorized operations. Use PostgreSQL RLS and least privilege.

## Recommended server operations
`createProduct`, `updateProduct`, `createCustomer`, `createOrder`, `confirmOrder`, `cancelOrder`, `calculateSchedule`, `rescheduleOrder`, `startProduction`, `completeProduction`, `createPayment`, `adjustInventory`, `createPurchase`, `generateReport`, `updatePermissions`.

## Error codes
`AUTH_REQUIRED`, `FORBIDDEN`, `VALIDATION_ERROR`, `PRODUCT_NOT_FOUND`, `CAPACITY_INSUFFICIENT`, `MATERIAL_INSUFFICIENT`, `SCHEDULE_UNAVAILABLE`, `ORDER_NOT_FOUND`, `ORDER_ALREADY_CANCELLED`, `PAYMENT_EXCEEDS_DUE`, `INVENTORY_INSUFFICIENT`.

## Security
No service-role keys in browser/GitHub. Validate inputs. Secure sessions. RLS. Audit sensitive actions. Rate-limit auth-sensitive endpoints. Validate uploaded files.

## Performance
Pagination, proper indexes, aggregate dashboard queries, debounced search, lazy loading and caching where appropriate.

## Testing
Unit: scheduler, FIFO, no-split, multi-day scheduling, delivery, payments, inventory, permissions.
Integration: order→schedule, production→inventory, payment→ledger, cancellation→reschedule.
E2E: Admin login, Manager permissions and complete order lifecycle.
