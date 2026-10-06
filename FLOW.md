# SYSTEM FLOW

## Authentication
`Login → Authenticate → Load User → Load Permissions → Authorized Dashboard`

## Product
`Authorized User → Create/Edit Product → Configure Capacity → Configure Production/Delivery Time → Save → Product Available`

## Customer
`Create Customer → Profile → Orders → Payments → Ledger → Outstanding`

## Order
`Create Order → Select Customer → Add Products/Quantities → Calculate Total → Save Draft → Confirm → Material Check → Capacity Check → Scheduler → Production Dates → Delivery Date`

## Scheduler
```text
Confirmed Order
→ Product Capacity
→ Existing Queue
→ FIFO/Priority
→ Working Calendar
→ Earliest Slot
→ Can complete full order?
   YES → Reserve
   NO  → Next full slot
→ Completion Date
→ Delivery Date
→ Save
```

## Example
Capacity 150; orders 100, 100, 100:
- Day 1: Order 1 = 100
- Day 2: Order 2 = 100
- Day 3: Order 3 = 100

No order is split.

## Capacity exception
If order = 200 and capacity = 150: `CAPACITY_INSUFFICIENT`; no automatic split.

## Cancellation
`Cancel → Permission Check → Release Reservation → Close Schedule → Recalculate Queue → Update Dates → Audit`

## Priority change
`Permission Check → Change Priority → Recalculate Queue → Update Production/Delivery Dates → Notify → Audit`

## Production
`Scheduled → Material Ready → Started → In Production → Quality Check → Completed → Ready for Dispatch`

## Delivery
`Ready → Packed → Dispatched → In Transit → Delivered`

## Payment
`Add Payment → Validate → Update Ledger → Recalculate Due → Update Status → Audit`

## Inventory
`Purchase/Stock In → Reservation → Production Consumption → Finished Goods Output → Dispatch → Delivery`

## Manager permissions
`Admin Creates Manager → Assign Module/Action Permissions → Save → Manager Login → Server Permission Check → Allow/Reject`
