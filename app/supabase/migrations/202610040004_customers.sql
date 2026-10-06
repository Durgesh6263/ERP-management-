BEGIN;

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (name = btrim(name) AND length(name) BETWEEN 1 AND 160),
  company_name TEXT CHECK (company_name IS NULL OR length(company_name) <= 160),
  phone TEXT CHECK (phone IS NULL OR length(phone) <= 40),
  email TEXT CHECK (email IS NULL OR (length(email) <= 254 AND email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  gst_number TEXT CHECK (gst_number IS NULL OR length(gst_number) <= 32),
  payment_terms TEXT CHECK (payment_terms IS NULL OR length(payment_terms) <= 100),
  credit_limit NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customers_id_business_unique UNIQUE (id, business_id)
);

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS gst_number TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(14, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE public.customers SET credit_limit = 0 WHERE credit_limit IS NULL;
ALTER TABLE public.customers ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN name SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN credit_limit SET DEFAULT 0;
ALTER TABLE public.customers ALTER COLUMN credit_limit SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN status SET DEFAULT 'ACTIVE';
ALTER TABLE public.customers ALTER COLUMN status SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  address_type TEXT NOT NULL DEFAULT 'PRIMARY' CHECK (length(address_type) BETWEEN 1 AND 40),
  address TEXT CHECK (address IS NULL OR length(address) <= 2000),
  city TEXT CHECK (city IS NULL OR length(city) <= 120),
  state TEXT CHECK (state IS NULL OR length(state) <= 120),
  postal_code TEXT CHECK (postal_code IS NULL OR length(postal_code) <= 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS address_type TEXT NOT NULL DEFAULT 'PRIMARY';
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.customer_addresses ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.customer_addresses ALTER COLUMN customer_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.customers'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.customers ADD CONSTRAINT customers_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.customers'::regclass AND conname = 'customers_business_id_fkey'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_business_id_fkey
      FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.customers'::regclass AND conname = 'customers_id_business_unique'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_id_business_unique UNIQUE (id, business_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.customer_addresses'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.customer_addresses ADD CONSTRAINT customer_addresses_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.customer_addresses'::regclass AND conname = 'customer_addresses_customer_id_fkey'
  ) THEN
    ALTER TABLE public.customer_addresses
      ADD CONSTRAINT customer_addresses_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.customers'::regclass AND conname = 'customers_name_valid'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_name_valid
      CHECK (name = btrim(name) AND length(name) BETWEEN 1 AND 160);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.customers'::regclass AND conname = 'customers_credit_limit_nonnegative'
  ) THEN
    ALTER TABLE public.customers ADD CONSTRAINT customers_credit_limit_nonnegative CHECK (credit_limit >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.customers'::regclass AND conname = 'customers_status_valid'
  ) THEN
    ALTER TABLE public.customers ADD CONSTRAINT customers_status_valid CHECK (status IN ('ACTIVE', 'INACTIVE'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.customers'::regclass AND conname = 'customers_email_valid'
  ) THEN
    ALTER TABLE public.customers ADD CONSTRAINT customers_email_valid
      CHECK (email IS NULL OR (length(email) <= 254 AND email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS customers_business_id_idx ON public.customers (business_id);
CREATE INDEX IF NOT EXISTS customers_business_phone_idx ON public.customers (business_id, phone);
CREATE INDEX IF NOT EXISTS customers_business_email_idx ON public.customers (business_id, lower(email));
CREATE INDEX IF NOT EXISTS customers_business_status_idx ON public.customers (business_id, status);
CREATE INDEX IF NOT EXISTS customers_business_name_idx ON public.customers (business_id, lower(name));
CREATE INDEX IF NOT EXISTS customer_addresses_customer_id_idx ON public.customer_addresses (customer_id);

CREATE OR REPLACE FUNCTION public.guard_customer_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.id IS DISTINCT FROM NEW.id
     OR OLD.business_id IS DISTINCT FROM NEW.business_id
     OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'CUSTOMER_IDENTITY_IMMUTABLE' USING ERRCODE = '42501';
  END IF;

  IF (to_jsonb(OLD) - 'status' - 'updated_at')
       IS DISTINCT FROM (to_jsonb(NEW) - 'status' - 'updated_at')
     AND NOT public.has_business_permission(OLD.business_id, 'customers.edit') THEN
    RAISE EXCEPTION 'FORBIDDEN: customers.edit' USING ERRCODE = '42501';
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'INACTIVE'
       AND NOT public.has_business_permission(OLD.business_id, 'customers.delete') THEN
      RAISE EXCEPTION 'FORBIDDEN: customers.delete' USING ERRCODE = '42501';
    END IF;
    IF NEW.status = 'ACTIVE'
       AND NOT public.has_business_permission(OLD.business_id, 'customers.edit') THEN
      RAISE EXCEPTION 'FORBIDDEN: customers.edit' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER customers_guard_permissions
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.guard_customer_permissions();

CREATE OR REPLACE FUNCTION public.audit_customer_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID;
  event_action TEXT;
BEGIN
  SELECT id INTO actor_id
  FROM public.users
  WHERE auth_user_id = auth.uid() AND business_id = COALESCE(NEW.business_id, OLD.business_id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, new_data)
    VALUES (NEW.business_id, actor_id, 'CUSTOMER_CREATED', 'customer', NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;

  event_action := CASE
    WHEN OLD.status = 'ACTIVE' AND NEW.status = 'INACTIVE' THEN 'CUSTOMER_DEACTIVATED'
    WHEN OLD.status = 'INACTIVE' AND NEW.status = 'ACTIVE' THEN 'CUSTOMER_ACTIVATED'
    ELSE 'CUSTOMER_EDITED'
  END;

  INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (NEW.business_id, actor_id, event_action, 'customer', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_customer_address_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_customer_id UUID := COALESCE(NEW.customer_id, OLD.customer_id);
  row_business_id UUID;
  actor_id UUID;
BEGIN
  SELECT business_id INTO row_business_id
  FROM public.customers WHERE id = row_customer_id;

  SELECT id INTO actor_id
  FROM public.users
  WHERE auth_user_id = auth.uid() AND business_id = row_business_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, new_data)
    VALUES (row_business_id, actor_id, 'CUSTOMER_ADDRESS_CREATED', 'customer_address', NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;

  INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (row_business_id, actor_id, 'CUSTOMER_ADDRESS_EDITED', 'customer_address', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  RETURN NEW;
END;
$$;

CREATE TRIGGER customers_audit_change
AFTER INSERT OR UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.audit_customer_change();

CREATE TRIGGER customers_touch_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER customer_addresses_audit_change
AFTER INSERT OR UPDATE ON public.customer_addresses
FOR EACH ROW EXECUTE FUNCTION public.audit_customer_address_change();

CREATE TRIGGER customer_addresses_touch_updated_at
BEFORE UPDATE ON public.customer_addresses
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.customers, public.customer_addresses TO authenticated;
REVOKE DELETE ON public.customers, public.customer_addresses FROM anon, authenticated;
GRANT ALL ON public.customers, public.customer_addresses TO service_role;

DO $$
DECLARE policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('customers', 'customer_addresses')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', policy_record.policyname, policy_record.tablename);
  END LOOP;
END;
$$;

CREATE POLICY customers_select_business_customers_view ON public.customers
FOR SELECT USING (
  public.is_business_member(business_id)
  AND public.has_business_permission(business_id, 'customers.view')
);
CREATE POLICY customers_insert_business_customers_create ON public.customers
FOR INSERT WITH CHECK (
  public.is_business_member(business_id)
  AND public.has_business_permission(business_id, 'customers.create')
);
CREATE POLICY customers_update_business_customer_managers ON public.customers
FOR UPDATE USING (
  public.is_business_member(business_id)
  AND (
    public.has_business_permission(business_id, 'customers.edit')
    OR public.has_business_permission(business_id, 'customers.delete')
  )
)
WITH CHECK (
  public.is_business_member(business_id)
  AND (
    public.has_business_permission(business_id, 'customers.edit')
    OR public.has_business_permission(business_id, 'customers.delete')
  )
);

CREATE POLICY customer_addresses_select_business_customers_view ON public.customer_addresses
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_addresses.customer_id
      AND public.is_business_member(c.business_id)
      AND public.has_business_permission(c.business_id, 'customers.view')
  )
);
CREATE POLICY customer_addresses_insert_business_customers_write ON public.customer_addresses
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_addresses.customer_id
      AND public.is_business_member(c.business_id)
      AND (
        public.has_business_permission(c.business_id, 'customers.create')
        OR public.has_business_permission(c.business_id, 'customers.edit')
      )
  )
);
CREATE POLICY customer_addresses_update_business_customers_edit ON public.customer_addresses
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_addresses.customer_id
      AND public.is_business_member(c.business_id)
      AND public.has_business_permission(c.business_id, 'customers.edit')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_addresses.customer_id
      AND public.is_business_member(c.business_id)
      AND public.has_business_permission(c.business_id, 'customers.edit')
  )
);

INSERT INTO public.permissions (module, action, description) VALUES
  ('customers', 'view', 'View business customers'),
  ('customers', 'create', 'Create business customers'),
  ('customers', 'edit', 'Edit customer information and addresses'),
  ('customers', 'delete', 'Deactivate customers while preserving history')
ON CONFLICT (module, action) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.module = 'customers'
WHERE replace(lower(trim(r.name)), ' ', '_') IN ('super_admin', 'admin', 'manager')
  AND p.action IN ('view', 'create')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.module = 'customers' AND p.action = 'edit'
WHERE replace(lower(trim(r.name)), ' ', '_') IN ('super_admin', 'admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.module = 'customers' AND p.action = 'delete'
WHERE replace(lower(trim(r.name)), ' ', '_') = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.create_customer_with_address(
  target_business_id UUID,
  target_name TEXT,
  target_company_name TEXT,
  target_phone TEXT,
  target_email TEXT,
  target_gst_number TEXT,
  target_payment_terms TEXT,
  target_credit_limit NUMERIC,
  target_address TEXT,
  target_city TEXT,
  target_state TEXT,
  target_postal_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_id UUID;
BEGIN
  IF NOT public.is_business_member(target_business_id)
     OR NOT public.has_business_permission(target_business_id, 'customers.create') THEN
    RAISE EXCEPTION 'FORBIDDEN: customers.create' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.customers (
    business_id, name, company_name, phone, email, gst_number, payment_terms, credit_limit
  ) VALUES (
    target_business_id,
    btrim(target_name),
    NULLIF(btrim(target_company_name), ''),
    NULLIF(btrim(target_phone), ''),
    NULLIF(lower(btrim(target_email)), ''),
    NULLIF(upper(btrim(target_gst_number)), ''),
    NULLIF(btrim(target_payment_terms), ''),
    target_credit_limit
  ) RETURNING id INTO customer_id;

  IF NULLIF(btrim(target_address), '') IS NOT NULL
     OR NULLIF(btrim(target_city), '') IS NOT NULL
     OR NULLIF(btrim(target_state), '') IS NOT NULL
     OR NULLIF(btrim(target_postal_code), '') IS NOT NULL THEN
    INSERT INTO public.customer_addresses (
      customer_id, address_type, address, city, state, postal_code
    ) VALUES (
      customer_id, 'PRIMARY', NULLIF(btrim(target_address), ''), NULLIF(btrim(target_city), ''),
      NULLIF(btrim(target_state), ''), NULLIF(btrim(target_postal_code), '')
    );
  END IF;

  RETURN customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_customer_with_address(
  target_business_id UUID,
  target_customer_id UUID,
  target_address_id UUID,
  target_name TEXT,
  target_company_name TEXT,
  target_phone TEXT,
  target_email TEXT,
  target_gst_number TEXT,
  target_payment_terms TEXT,
  target_credit_limit NUMERIC,
  target_address TEXT,
  target_city TEXT,
  target_state TEXT,
  target_postal_code TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_business_member(target_business_id)
     OR NOT public.has_business_permission(target_business_id, 'customers.edit') THEN
    RAISE EXCEPTION 'FORBIDDEN: customers.edit' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM public.customers
  WHERE id = target_customer_id AND business_id = target_business_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CUSTOMER_NOT_FOUND';
  END IF;

  UPDATE public.customers SET
    name = btrim(target_name),
    company_name = NULLIF(btrim(target_company_name), ''),
    phone = NULLIF(btrim(target_phone), ''),
    email = NULLIF(lower(btrim(target_email)), ''),
    gst_number = NULLIF(upper(btrim(target_gst_number)), ''),
    payment_terms = NULLIF(btrim(target_payment_terms), ''),
    credit_limit = target_credit_limit
  WHERE id = target_customer_id AND business_id = target_business_id;

  IF target_address_id IS NOT NULL THEN
    UPDATE public.customer_addresses SET
      address = NULLIF(btrim(target_address), ''),
      city = NULLIF(btrim(target_city), ''),
      state = NULLIF(btrim(target_state), ''),
      postal_code = NULLIF(btrim(target_postal_code), '')
    WHERE id = target_address_id AND customer_id = target_customer_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'CUSTOMER_ADDRESS_NOT_FOUND';
    END IF;
  ELSIF NULLIF(btrim(target_address), '') IS NOT NULL
     OR NULLIF(btrim(target_city), '') IS NOT NULL
     OR NULLIF(btrim(target_state), '') IS NOT NULL
     OR NULLIF(btrim(target_postal_code), '') IS NOT NULL THEN
    INSERT INTO public.customer_addresses (
      customer_id, address_type, address, city, state, postal_code
    ) VALUES (
      target_customer_id, 'PRIMARY', NULLIF(btrim(target_address), ''), NULLIF(btrim(target_city), ''),
      NULLIF(btrim(target_state), ''), NULLIF(btrim(target_postal_code), '')
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_with_address(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_customer_with_address(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT)
  TO authenticated;
REVOKE ALL ON FUNCTION public.update_customer_with_address(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_customer_with_address(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT)
  TO authenticated;

COMMIT;