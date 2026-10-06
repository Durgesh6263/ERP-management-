BEGIN;

CREATE OR REPLACE FUNCTION public.has_business_permission(
  target_business_id UUID,
  target_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT CASE
        WHEN permission_override.allowed IS NOT NULL THEN permission_override.allowed
        ELSE EXISTS (
          SELECT 1
          FROM public.user_roles ur
          JOIN public.role_permissions rp ON rp.role_id = ur.role_id
          JOIN public.permissions p ON p.id = rp.permission_id
          WHERE ur.user_id = u.id
            AND p.module || '.' || p.action = target_permission
        )
      END
      FROM public.users u
      JOIN public.businesses b ON b.id = u.business_id
      LEFT JOIN LATERAL (
        SELECT up.allowed
        FROM public.user_permissions up
        JOIN public.permissions p ON p.id = up.permission_id
        WHERE up.user_id = u.id
          AND p.module || '.' || p.action = target_permission
        LIMIT 1
      ) permission_override ON TRUE
      WHERE u.auth_user_id = auth.uid()
        AND u.business_id = target_business_id
        AND u.status = 'ACTIVE'
        AND b.status = 'ACTIVE'
      LIMIT 1
    ),
    FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.has_business_permission(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_business_permission(UUID, TEXT) TO authenticated;

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  parent_id UUID,
  name TEXT NOT NULL CHECK (name = btrim(name) AND length(name) BETWEEN 1 AND 80),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT categories_id_business_unique UNIQUE (id, business_id),
  CONSTRAINT categories_id_parent_business_unique UNIQUE (id, parent_id, business_id),
  CONSTRAINT categories_parent_not_self CHECK (parent_id IS NULL OR parent_id <> id),
  CONSTRAINT categories_parent_business_fk
    FOREIGN KEY (parent_id, business_id)
    REFERENCES public.categories (id, business_id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX categories_business_name_unique
  ON public.categories (business_id, lower(name));
CREATE INDEX categories_business_parent_status_idx
  ON public.categories (business_id, parent_id, status);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id UUID,
  subcategory_id UUID,
  name TEXT NOT NULL CHECK (name = btrim(name) AND length(name) BETWEEN 1 AND 160),
  sku TEXT NOT NULL CHECK (sku = upper(btrim(sku)) AND length(sku) BETWEEN 1 AND 64),
  description TEXT CHECK (description IS NULL OR length(description) <= 2000),
  unit TEXT NOT NULL CHECK (unit IN ('Piece', 'Bundle', 'Box', 'Kg', 'Meter', 'Set')),
  selling_price NUMERIC(14, 2) NOT NULL CHECK (selling_price >= 0),
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (tax_rate BETWEEN 0 AND 100),
  daily_capacity INTEGER NOT NULL CHECK (daily_capacity > 0),
  production_unit TEXT NOT NULL CHECK (production_unit IN ('Piece', 'Bundle', 'Box', 'Kg', 'Meter', 'Set')),
  production_min_days INTEGER NOT NULL DEFAULT 1 CHECK (production_min_days >= 0),
  production_max_days INTEGER NOT NULL DEFAULT 1 CHECK (production_max_days >= production_min_days),
  setup_minutes INTEGER NOT NULL DEFAULT 0 CHECK (setup_minutes >= 0),
  delivery_min_days INTEGER NOT NULL DEFAULT 0 CHECK (delivery_min_days >= 0),
  delivery_max_days INTEGER NOT NULL DEFAULT 0 CHECK (delivery_max_days >= delivery_min_days),
  min_stock NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  reorder_level NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT products_id_business_unique UNIQUE (id, business_id),
  CONSTRAINT products_category_business_fk
    FOREIGN KEY (category_id, business_id)
    REFERENCES public.categories (id, business_id)
    ON DELETE RESTRICT,
  CONSTRAINT products_subcategory_parent_business_fk
    FOREIGN KEY (subcategory_id, category_id, business_id)
    REFERENCES public.categories (id, parent_id, business_id)
    ON DELETE RESTRICT,
  CONSTRAINT products_subcategory_requires_category CHECK (
    subcategory_id IS NULL OR category_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX products_business_sku_unique
  ON public.products (business_id, upper(btrim(sku)));
CREATE INDEX products_business_idx ON public.products (business_id);
CREATE INDEX products_business_category_idx ON public.products (business_id, category_id);
CREATE INDEX products_business_active_idx ON public.products (business_id, active);

CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  product_id UUID NOT NULL,
  sku TEXT CHECK (sku IS NULL OR (sku = upper(btrim(sku)) AND length(sku) BETWEEN 1 AND 64)),
  name TEXT NOT NULL CHECK (name = btrim(name) AND length(name) BETWEEN 1 AND 120),
  price NUMERIC(14, 2) CHECK (price IS NULL OR price >= 0),
  daily_capacity INTEGER CHECK (daily_capacity IS NULL OR daily_capacity > 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_variants_id_business_unique UNIQUE (id, business_id),
  CONSTRAINT product_variants_product_business_fk
    FOREIGN KEY (product_id, business_id)
    REFERENCES public.products (id, business_id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX product_variants_business_sku_unique
  ON public.product_variants (business_id, upper(btrim(sku)))
  WHERE sku IS NOT NULL;
CREATE INDEX product_variants_business_product_idx
  ON public.product_variants (business_id, product_id);

CREATE OR REPLACE FUNCTION public.validate_category_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  parent_parent_id UUID;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT parent_id INTO parent_parent_id
  FROM public.categories
  WHERE id = NEW.parent_id AND business_id = NEW.business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CATEGORY_PARENT_NOT_FOUND';
  END IF;

  IF parent_parent_id IS NOT NULL
     OR EXISTS (
       SELECT 1 FROM public.categories
       WHERE parent_id = NEW.id AND business_id = NEW.business_id
     ) THEN
    RAISE EXCEPTION 'CATEGORY_HIERARCHY_LIMIT';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER categories_validate_parent
BEFORE INSERT OR UPDATE OF parent_id, business_id ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.validate_category_parent();

CREATE OR REPLACE FUNCTION public.validate_product_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.category_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.categories
    WHERE id = NEW.category_id
      AND business_id = NEW.business_id
      AND parent_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'PRODUCT_CATEGORY_MUST_BE_TOP_LEVEL';
  END IF;

  IF NEW.subcategory_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.categories
    WHERE id = NEW.subcategory_id
      AND parent_id = NEW.category_id
      AND business_id = NEW.business_id
  ) THEN
    RAISE EXCEPTION 'PRODUCT_SUBCATEGORY_MISMATCH';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER products_validate_categories
BEFORE INSERT OR UPDATE OF category_id, subcategory_id, business_id ON public.products
FOR EACH ROW EXECUTE FUNCTION public.validate_product_categories();

CREATE OR REPLACE FUNCTION public.guard_product_sensitive_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  request_role TEXT := COALESCE(
    current_setting('request.jwt.claims', TRUE)::JSONB ->> 'role',
    ''
  );
BEGIN
  IF request_role = 'service_role' THEN
    RETURN NEW;
  END IF;

    IF (
         OLD.selling_price IS DISTINCT FROM NEW.selling_price
         OR OLD.tax_rate IS DISTINCT FROM NEW.tax_rate
       )
       AND NOT public.has_business_permission(OLD.business_id, 'products.change_price') THEN
    RAISE EXCEPTION 'FORBIDDEN: products.change_price' USING ERRCODE = '42501';
  END IF;

  IF OLD.daily_capacity IS DISTINCT FROM NEW.daily_capacity
     AND NOT public.has_business_permission(OLD.business_id, 'products.change_capacity') THEN
    RAISE EXCEPTION 'FORBIDDEN: products.change_capacity' USING ERRCODE = '42501';
  END IF;

  IF OLD.production_unit IS DISTINCT FROM NEW.production_unit
     OR OLD.production_min_days IS DISTINCT FROM NEW.production_min_days
     OR OLD.production_max_days IS DISTINCT FROM NEW.production_max_days
     OR OLD.setup_minutes IS DISTINCT FROM NEW.setup_minutes THEN
    IF NOT public.has_business_permission(OLD.business_id, 'products.change_production_time') THEN
      RAISE EXCEPTION 'FORBIDDEN: products.change_production_time' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF OLD.delivery_min_days IS DISTINCT FROM NEW.delivery_min_days
     OR OLD.delivery_max_days IS DISTINCT FROM NEW.delivery_max_days THEN
    IF NOT public.has_business_permission(OLD.business_id, 'products.change_delivery_time') THEN
      RAISE EXCEPTION 'FORBIDDEN: products.change_delivery_time' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER products_guard_sensitive_changes
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.guard_product_sensitive_changes();

CREATE OR REPLACE FUNCTION public.guard_variant_sensitive_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  request_role TEXT := COALESCE(
    current_setting('request.jwt.claims', TRUE)::JSONB ->> 'role',
    ''
  );
BEGIN
  IF request_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF OLD.price IS DISTINCT FROM NEW.price
     AND NOT public.has_business_permission(OLD.business_id, 'products.change_price') THEN
    RAISE EXCEPTION 'FORBIDDEN: products.change_price' USING ERRCODE = '42501';
  END IF;

  IF OLD.daily_capacity IS DISTINCT FROM NEW.daily_capacity
     AND NOT public.has_business_permission(OLD.business_id, 'products.change_capacity') THEN
    RAISE EXCEPTION 'FORBIDDEN: products.change_capacity' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER product_variants_guard_sensitive_changes
BEFORE UPDATE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.guard_variant_sensitive_changes();

CREATE OR REPLACE FUNCTION public.audit_product_configuration_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_business_id UUID;
  row_id UUID;
  actor_id UUID;
  old_record JSONB;
  new_record JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    row_business_id := OLD.business_id;
    row_id := OLD.id;
    old_record := to_jsonb(OLD);
  ELSE
    row_business_id := NEW.business_id;
    row_id := NEW.id;
    new_record := to_jsonb(NEW);
    IF TG_OP = 'UPDATE' THEN
      old_record := to_jsonb(OLD);
    END IF;
  END IF;

  SELECT id INTO actor_id
  FROM public.users
  WHERE auth_user_id = auth.uid() AND business_id = row_business_id;

  IF TG_TABLE_NAME = 'categories' THEN
    INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (
      row_business_id,
      actor_id,
      CASE
        WHEN TG_OP = 'INSERT' THEN 'CATEGORY_CREATED'
        WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'CATEGORY_STATUS_CHANGED'
        ELSE 'CATEGORY_UPDATED'
      END,
      'category',
      row_id,
      old_record,
      new_record
    );
  ELSIF TG_TABLE_NAME = 'products' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, new_data)
      VALUES (row_business_id, actor_id, 'PRODUCT_CREATED', 'product', row_id, new_record);
    ELSE
      INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_data, new_data)
      VALUES (
        row_business_id,
        actor_id,
        CASE WHEN OLD.active IS DISTINCT FROM NEW.active
          THEN 'PRODUCT_STATUS_CHANGED' ELSE 'PRODUCT_UPDATED' END,
        'product',
        row_id,
        old_record,
        new_record
      );

      IF OLD.sku IS DISTINCT FROM NEW.sku THEN
        INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (row_business_id, actor_id, 'PRODUCT_SKU_CHANGED', 'product', row_id, old_record, new_record);
      END IF;
      IF OLD.selling_price IS DISTINCT FROM NEW.selling_price THEN
        INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (row_business_id, actor_id, 'PRODUCT_PRICE_CHANGED', 'product', row_id, old_record, new_record);
      END IF;
      IF OLD.tax_rate IS DISTINCT FROM NEW.tax_rate THEN
        INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (row_business_id, actor_id, 'PRODUCT_TAX_RATE_CHANGED', 'product', row_id, old_record, new_record);
      END IF;
      IF OLD.daily_capacity IS DISTINCT FROM NEW.daily_capacity THEN
        INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (row_business_id, actor_id, 'PRODUCT_CAPACITY_CHANGED', 'product', row_id, old_record, new_record);
      END IF;
      IF OLD.production_unit IS DISTINCT FROM NEW.production_unit
         OR OLD.production_min_days IS DISTINCT FROM NEW.production_min_days
         OR OLD.production_max_days IS DISTINCT FROM NEW.production_max_days
         OR OLD.setup_minutes IS DISTINCT FROM NEW.setup_minutes THEN
        INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (row_business_id, actor_id, 'PRODUCT_PRODUCTION_TIME_CHANGED', 'product', row_id, old_record, new_record);
      END IF;
      IF OLD.delivery_min_days IS DISTINCT FROM NEW.delivery_min_days
         OR OLD.delivery_max_days IS DISTINCT FROM NEW.delivery_max_days THEN
        INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (row_business_id, actor_id, 'PRODUCT_DELIVERY_TIME_CHANGED', 'product', row_id, old_record, new_record);
      END IF;
    END IF;
  ELSE
    INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (
      row_business_id,
      actor_id,
      CASE WHEN TG_OP = 'INSERT' THEN 'PRODUCT_VARIANT_CREATED' ELSE 'PRODUCT_VARIANT_UPDATED' END,
      'product_variant',
      row_id,
      old_record,
      new_record
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER categories_audit_change
AFTER INSERT OR UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.audit_product_configuration_change();

CREATE TRIGGER products_audit_change
AFTER INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.audit_product_configuration_change();

CREATE TRIGGER product_variants_audit_change
AFTER INSERT OR UPDATE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.audit_product_configuration_change();

CREATE TRIGGER categories_touch_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER products_touch_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER product_variants_touch_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE
  ON public.categories, public.products, public.product_variants
  TO authenticated;
GRANT ALL
  ON public.categories, public.products, public.product_variants
  TO service_role;

CREATE POLICY categories_select_business_products_view ON public.categories
FOR SELECT USING (
  public.is_business_member(business_id)
  AND public.has_business_permission(business_id, 'products.view')
);
CREATE POLICY categories_insert_business_products_create ON public.categories
FOR INSERT WITH CHECK (
  public.is_business_member(business_id)
  AND public.has_business_permission(business_id, 'products.create')
);
CREATE POLICY categories_update_business_products_edit ON public.categories
FOR UPDATE USING (
  public.is_business_member(business_id)
  AND public.has_business_permission(business_id, 'products.edit')
)
WITH CHECK (
  public.is_business_member(business_id)
  AND public.has_business_permission(business_id, 'products.edit')
);

CREATE POLICY products_select_business_products_view ON public.products
FOR SELECT USING (
  public.is_business_member(business_id)
  AND public.has_business_permission(business_id, 'products.view')
);
CREATE POLICY products_insert_business_products_create ON public.products
FOR INSERT WITH CHECK (
  public.is_business_member(business_id)
  AND public.has_business_permission(business_id, 'products.create')
);
CREATE POLICY products_update_business_products_edit ON public.products
FOR UPDATE USING (
  public.is_business_member(business_id)
  AND public.has_business_permission(business_id, 'products.edit')
)
WITH CHECK (
  public.is_business_member(business_id)
  AND public.has_business_permission(business_id, 'products.edit')
);

CREATE POLICY product_variants_select_business_products_view ON public.product_variants
FOR SELECT USING (
  public.is_business_member(business_id)
  AND public.has_business_permission(business_id, 'products.view')
);
CREATE POLICY product_variants_insert_business_products_create ON public.product_variants
FOR INSERT WITH CHECK (
  public.is_business_member(business_id)
  AND public.has_business_permission(business_id, 'products.create')
);
CREATE POLICY product_variants_update_business_products_edit ON public.product_variants
FOR UPDATE USING (
  public.is_business_member(business_id)
  AND public.has_business_permission(business_id, 'products.edit')
)
WITH CHECK (
  public.is_business_member(business_id)
  AND public.has_business_permission(business_id, 'products.edit')
);

INSERT INTO public.permissions (module, action, description) VALUES
  ('products', 'view', 'View products and categories'),
  ('products', 'create', 'Create products and categories'),
  ('products', 'edit', 'Edit product and category details'),
  ('products', 'delete', 'Delete products when no records reference them'),
  ('products', 'change_price', 'Change product and variant prices'),
  ('products', 'change_capacity', 'Change product and variant daily capacity'),
  ('products', 'change_production_time', 'Change production unit, duration, and setup time'),
  ('products', 'change_delivery_time', 'Change delivery duration')
ON CONFLICT (module, action) DO UPDATE
SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.module = 'products'
WHERE replace(lower(trim(r.name)), ' ', '_') IN ('admin', 'super_admin')
  AND p.action IN ('view', 'create', 'edit')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.module = 'products'
WHERE replace(lower(trim(r.name)), ' ', '_') = 'super_admin'
  AND p.action IN (
    'delete',
    'change_price',
    'change_capacity',
    'change_production_time',
    'change_delivery_time'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.module = 'products' AND p.action = 'view'
WHERE replace(lower(trim(r.name)), ' ', '_') = 'manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;