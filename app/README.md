# Manufacturing Workspace

## Authentication Setup

1. Create a Supabase project and configure Email authentication. Disable public signups; accounts are provisioned by an existing account with the `users.manage` permission.
2. Set the Supabase Site URL to the value of `NEXT_PUBLIC_SITE_URL` and allow the `/auth/callback` redirect URL. For local development, use `http://localhost:3000`.
3. Copy `.env.example` to `.env.local` and set the Supabase URL, anon key, and service-role key. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side and out of source control.
4. Apply `supabase/migrations/202610040001_init_foundation.sql`, then `supabase/seed.sql`, followed by migrations `202610040002_auth_roles.sql`, `202610040003_products.sql`, `202610040004_customers.sql`, and `202610040005_materials_bom_inventory.sql` in order.

The seed creates the development business and its `Super Admin`, `Admin`, and `Manager` roles. Create the first auth account in the Supabase dashboard, then associate it with the seeded Super Admin role using the SQL editor. Replace the auth UUID, owner name, and email below:

```sql
DO $$
DECLARE
	profile_id UUID;
BEGIN
	INSERT INTO public.users (business_id, auth_user_id, name, email, status)
	VALUES (
		'11111111-1111-4111-8111-111111111111',
		'REPLACE-WITH-AUTH-USER-UUID'::UUID,
		'Business Owner',
		'owner@example.com',
		'ACTIVE'
	)
	RETURNING id INTO profile_id;

	INSERT INTO public.user_roles (business_id, user_id, role_id)
	VALUES (
		'11111111-1111-4111-8111-111111111111',
		profile_id,
		'22222222-2222-4222-8222-222222222222'
	);
END $$;
```

Once the first account is provisioned, sign in at `/login` and invite additional users from `/users`. Invitations use Supabase Auth email delivery; the callback and password-reset pages require the configured redirect URL. If an invite succeeds but database provisioning fails, review the invitation in Supabase Auth before retrying. Inactive, pending, or suspended profiles and inactive businesses are rejected on every protected request. Account and role changes are server-authorized and audited.

## Product Configuration

Use `/categories` to create top-level categories and one level of subcategories, and `/products` to search, filter, create, edit, view, activate, and deactivate products. Product creation and category changes require `products.create`; edits and status changes require `products.edit`. Price, capacity, production timing, and delivery timing each require their matching `products.change_*` permission on updates. The product migration grants the special configuration permissions to the seeded Super Admin role; other role grants can be managed in `role_permissions`.

There is no physical product or category delete action. Inactivation retains records and existing references. Variants are stored as a small configuration foundation only; stock tracking and scheduling are not part of this phase. Daily capacity is stored per product and does not split orders or create a production schedule.

## Customer Management

Use `/customers` to search, filter, create, view, edit, activate, and deactivate customer records. The existing role defaults remain authoritative: Manager can view/create, Admin can view/create/edit, and Super Admin additionally has `customers.delete` for deactivation. Customer records and addresses are tenant-scoped and audited. Orders, payments, and ledger summary values remain explicitly uncalculated until those modules exist; no placeholder history records are inserted.

## Materials, BOM, and Inventory Foundation

Use `/raw-materials` for material configuration and `/inventory` for stock overview, stock-in, adjustments, and transaction history. Raw-material stock starts at zero and can only change through the transactional inventory RPCs; every change records a signed transaction, reason/notes, actor, and audit event. Low stock is shown when current stock is at or below its reorder level.

Product details include versioned BOM configuration. BOM calculations multiply each quantity-per-product-unit by the requested quantity and do not create orders, reserve stock, or consume materials. The existing permission defaults are retained: Manager can view raw materials/inventory, Admin can maintain materials and add/adjust stock, and Super Admin additionally has raw-material deactivation and transaction-history access.

## Local Development

Run these commands from the `app` directory:

```bash
npm install
npm run dev
```

The application is available at [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm run lint
npm run build
```
