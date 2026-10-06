BEGIN;

CREATE TABLE IF NOT EXISTS public.raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  code TEXT CHECK (code IS NULL OR (code = upper(btrim(code)) AND length(code) BETWEEN 1 AND 64)),
  name TEXT NOT NULL CHECK (name = btrim(name) AND length(name) BETWEEN 1 AND 160),
  unit TEXT NOT NULL CHECK (unit IN ('kg', 'gram', 'litre', 'millilitre', 'meter', 'piece', 'bundle', 'box', 'set')),
  current_stock NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  min_stock NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  reorder_level NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  purchase_price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT raw_materials_id_business_unique UNIQUE (id, business_id)
);

ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'piece';
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS current_stock NUMERIC(14, 3) NOT NULL DEFAULT 0;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS min_stock NUMERIC(14, 3) NOT NULL DEFAULT 0;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS reorder_level NUMERIC(14, 3) NOT NULL DEFAULT 0;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(14, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE public.raw_materials SET current_stock = 0 WHERE current_stock IS NULL;
UPDATE public.raw_materials SET min_stock = 0 WHERE min_stock IS NULL;
UPDATE public.raw_materials SET reorder_level = 0 WHERE reorder_level IS NULL;
UPDATE public.raw_materials SET purchase_price = 0 WHERE purchase_price IS NULL;
UPDATE public.raw_materials SET status = 'ACTIVE' WHERE status IS NULL;
ALTER TABLE public.raw_materials ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.raw_materials ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.raw_materials ALTER COLUMN name SET NOT NULL;
ALTER TABLE public.raw_materials ALTER COLUMN unit SET NOT NULL;
ALTER TABLE public.raw_materials ALTER COLUMN current_stock SET DEFAULT 0;
ALTER TABLE public.raw_materials ALTER COLUMN current_stock SET NOT NULL;
ALTER TABLE public.raw_materials ALTER COLUMN min_stock SET DEFAULT 0;
ALTER TABLE public.raw_materials ALTER COLUMN min_stock SET NOT NULL;
ALTER TABLE public.raw_materials ALTER COLUMN reorder_level SET DEFAULT 0;
ALTER TABLE public.raw_materials ALTER COLUMN reorder_level SET NOT NULL;
ALTER TABLE public.raw_materials ALTER COLUMN purchase_price SET DEFAULT 0;
ALTER TABLE public.raw_materials ALTER COLUMN purchase_price SET NOT NULL;
ALTER TABLE public.raw_materials ALTER COLUMN status SET DEFAULT 'ACTIVE';
ALTER TABLE public.raw_materials ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.raw_materials'::regclass AND conname = 'raw_materials_values_valid') THEN
    ALTER TABLE public.raw_materials ADD CONSTRAINT raw_materials_values_valid CHECK (
      name = btrim(name) AND length(name) BETWEEN 1 AND 160
      AND unit IN ('kg', 'gram', 'litre', 'millilitre', 'meter', 'piece', 'bundle', 'box', 'set')
      AND current_stock >= 0 AND min_stock >= 0 AND reorder_level >= 0 AND purchase_price >= 0
      AND status IN ('ACTIVE', 'INACTIVE')
      AND (code IS NULL OR (code = upper(btrim(code)) AND length(code) BETWEEN 1 AND 64))
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  item_type TEXT NOT NULL,
  item_id UUID NOT NULL,
  current_stock NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  reserved_stock NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
  available_stock NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (available_stock >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_item_unique UNIQUE (business_id, item_type, item_id),
  CONSTRAINT inventory_available_matches CHECK (available_stock = current_stock - reserved_stock)
);

ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'raw_material';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS item_id UUID;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS current_stock NUMERIC(14, 3) NOT NULL DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS reserved_stock NUMERIC(14, 3) NOT NULL DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS available_stock NUMERIC(14, 3) NOT NULL DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE public.inventory i
SET business_id = rm.business_id
FROM public.raw_materials rm
WHERE i.business_id IS NULL AND i.item_type = 'raw_material' AND i.item_id = rm.id;
ALTER TABLE public.inventory ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN item_type SET NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN item_id SET NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN current_stock SET DEFAULT 0;
ALTER TABLE public.inventory ALTER COLUMN current_stock SET NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN reserved_stock SET DEFAULT 0;
ALTER TABLE public.inventory ALTER COLUMN reserved_stock SET NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN available_stock SET DEFAULT 0;
ALTER TABLE public.inventory ALTER COLUMN available_stock SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  item_type TEXT NOT NULL,
  item_id UUID NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT')),
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity <> 0),
  reference_type TEXT NOT NULL DEFAULT 'manual',
  reference_id UUID,
  notes TEXT CHECK (notes IS NULL OR length(notes) <= 500),
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_transaction_quantity_sign CHECK (
    transaction_type = 'ADJUSTMENT' OR quantity > 0
  )
);

ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'raw_material';
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS item_id UUID;
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS transaction_type TEXT NOT NULL DEFAULT 'ADJUSTMENT';
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS quantity NUMERIC(14, 3) NOT NULL DEFAULT 0;
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS reference_type TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.inventory_transactions ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.inventory_transactions ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.inventory_transactions ALTER COLUMN item_type SET NOT NULL;
ALTER TABLE public.inventory_transactions ALTER COLUMN item_id SET NOT NULL;
ALTER TABLE public.inventory_transactions ALTER COLUMN transaction_type SET NOT NULL;
ALTER TABLE public.inventory_transactions ALTER COLUMN quantity SET NOT NULL;
ALTER TABLE public.inventory_transactions ALTER COLUMN reference_type SET NOT NULL;
ALTER TABLE public.inventory_transactions ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE public.inventory_transactions ALTER COLUMN created_at SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.product_bom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_bom_id_business_unique UNIQUE (id, business_id),
  CONSTRAINT product_bom_version_unique UNIQUE (business_id, product_id, version),
  CONSTRAINT product_bom_product_business_fk
    FOREIGN KEY (product_id, business_id)
    REFERENCES public.products (id, business_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.bom_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  bom_id UUID NOT NULL,
  raw_material_id UUID NOT NULL,
  quantity_per_unit NUMERIC(16, 6) NOT NULL CHECK (quantity_per_unit > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bom_items_bom_material_unique UNIQUE (bom_id, raw_material_id),
  CONSTRAINT bom_items_bom_business_fk
    FOREIGN KEY (bom_id, business_id)
    REFERENCES public.product_bom (id, business_id) ON DELETE RESTRICT,
  CONSTRAINT bom_items_material_business_fk
    FOREIGN KEY (raw_material_id, business_id)
    REFERENCES public.raw_materials (id, business_id) ON DELETE RESTRICT
);

ALTER TABLE public.product_bom ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.product_bom ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE public.product_bom ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.product_bom ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.product_bom ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.product_bom ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE public.product_bom b
SET business_id = p.business_id
FROM public.products p
WHERE b.business_id IS NULL AND b.product_id = p.id;
ALTER TABLE public.product_bom ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.product_bom ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.product_bom ALTER COLUMN product_id SET NOT NULL;

ALTER TABLE public.bom_items ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.bom_items ADD COLUMN IF NOT EXISTS bom_id UUID;
ALTER TABLE public.bom_items ADD COLUMN IF NOT EXISTS raw_material_id UUID;
ALTER TABLE public.bom_items ADD COLUMN IF NOT EXISTS quantity_per_unit NUMERIC(16, 6);
ALTER TABLE public.bom_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.bom_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE public.bom_items i
SET business_id = b.business_id
FROM public.product_bom b
WHERE i.business_id IS NULL AND i.bom_id = b.id;
ALTER TABLE public.bom_items ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.bom_items ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.bom_items ALTER COLUMN bom_id SET NOT NULL;
ALTER TABLE public.bom_items ALTER COLUMN raw_material_id SET NOT NULL;
ALTER TABLE public.bom_items ALTER COLUMN quantity_per_unit SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.inventory'::regclass AND contype = 'p') THEN
    ALTER TABLE public.inventory ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.inventory'::regclass AND conname = 'inventory_available_matches') THEN
    ALTER TABLE public.inventory ADD CONSTRAINT inventory_available_matches CHECK (
      current_stock >= 0 AND reserved_stock >= 0 AND available_stock >= 0
      AND available_stock = current_stock - reserved_stock
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.inventory'::regclass AND conname = 'inventory_business_id_fkey') THEN
    ALTER TABLE public.inventory ADD CONSTRAINT inventory_business_id_fkey
      FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.inventory_transactions'::regclass AND contype = 'p') THEN
    ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.inventory_transactions'::regclass AND conname = 'inventory_transactions_business_id_fkey') THEN
    ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_business_id_fkey
      FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.inventory_transactions'::regclass AND conname = 'inventory_transactions_actor_business_fk') THEN
    ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_actor_business_fk
      FOREIGN KEY (created_by, business_id) REFERENCES public.users(id, business_id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.inventory_transactions'::regclass AND conname = 'inventory_transactions_values_valid') THEN
    ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_values_valid CHECK (
      transaction_type IN ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT')
      AND quantity <> 0
      AND (transaction_type = 'ADJUSTMENT' OR quantity > 0)
      AND (notes IS NULL OR length(notes) <= 500)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.product_bom'::regclass AND contype = 'p') THEN
    ALTER TABLE public.product_bom ADD CONSTRAINT product_bom_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.product_bom'::regclass AND conname = 'product_bom_id_business_unique') THEN
    ALTER TABLE public.product_bom ADD CONSTRAINT product_bom_id_business_unique UNIQUE (id, business_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.product_bom'::regclass AND conname = 'product_bom_product_business_fk') THEN
    ALTER TABLE public.product_bom ADD CONSTRAINT product_bom_product_business_fk
      FOREIGN KEY (product_id, business_id) REFERENCES public.products(id, business_id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.product_bom'::regclass AND conname = 'product_bom_version_unique') THEN
    ALTER TABLE public.product_bom ADD CONSTRAINT product_bom_version_unique UNIQUE (business_id, product_id, version);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.bom_items'::regclass AND contype = 'p') THEN
    ALTER TABLE public.bom_items ADD CONSTRAINT bom_items_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.bom_items'::regclass AND conname = 'bom_items_quantity_positive') THEN
    ALTER TABLE public.bom_items ADD CONSTRAINT bom_items_quantity_positive CHECK (quantity_per_unit > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.bom_items'::regclass AND conname = 'bom_items_bom_material_unique') THEN
    ALTER TABLE public.bom_items ADD CONSTRAINT bom_items_bom_material_unique UNIQUE (bom_id, raw_material_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.bom_items'::regclass AND conname = 'bom_items_bom_business_fk') THEN
    ALTER TABLE public.bom_items ADD CONSTRAINT bom_items_bom_business_fk
      FOREIGN KEY (bom_id, business_id) REFERENCES public.product_bom(id, business_id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.bom_items'::regclass AND conname = 'bom_items_material_business_fk') THEN
    ALTER TABLE public.bom_items ADD CONSTRAINT bom_items_material_business_fk
      FOREIGN KEY (raw_material_id, business_id) REFERENCES public.raw_materials(id, business_id) ON DELETE RESTRICT;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS raw_materials_business_code_unique
  ON public.raw_materials (business_id, upper(btrim(code))) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS raw_materials_business_id_idx ON public.raw_materials (business_id);
CREATE INDEX IF NOT EXISTS raw_materials_business_name_idx ON public.raw_materials (business_id, lower(name));
CREATE INDEX IF NOT EXISTS raw_materials_business_status_idx ON public.raw_materials (business_id, status);
CREATE INDEX IF NOT EXISTS inventory_business_id_idx ON public.inventory (business_id);
CREATE INDEX IF NOT EXISTS inventory_business_item_idx ON public.inventory (business_id, item_type, item_id);
CREATE INDEX IF NOT EXISTS inventory_transactions_business_created_idx
  ON public.inventory_transactions (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_transactions_item_idx
  ON public.inventory_transactions (business_id, item_type, item_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS product_bom_one_active_per_product
  ON public.product_bom (business_id, product_id) WHERE active;
CREATE UNIQUE INDEX IF NOT EXISTS inventory_item_unique_idx
  ON public.inventory (business_id, item_type, item_id);
CREATE INDEX IF NOT EXISTS product_bom_business_product_idx ON public.product_bom (business_id, product_id, version DESC);
CREATE INDEX IF NOT EXISTS bom_items_business_bom_idx ON public.bom_items (business_id, bom_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.raw_materials'::regclass AND contype = 'p') THEN
    ALTER TABLE public.raw_materials ADD CONSTRAINT raw_materials_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.raw_materials'::regclass AND conname = 'raw_materials_business_id_fkey') THEN
    ALTER TABLE public.raw_materials ADD CONSTRAINT raw_materials_business_id_fkey
      FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.raw_materials'::regclass AND conname = 'raw_materials_id_business_unique') THEN
    ALTER TABLE public.raw_materials ADD CONSTRAINT raw_materials_id_business_unique UNIQUE (id, business_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.inventory'::regclass AND contype = 'p') THEN
    ALTER TABLE public.inventory ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.inventory_transactions'::regclass AND contype = 'p') THEN
    ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.product_bom'::regclass AND contype = 'p') THEN
    ALTER TABLE public.product_bom ADD CONSTRAINT product_bom_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.bom_items'::regclass AND contype = 'p') THEN
    ALTER TABLE public.bom_items ADD CONSTRAINT bom_items_pkey PRIMARY KEY (id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_raw_material_stock_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.current_stock IS DISTINCT FROM NEW.current_stock
     AND current_setting('app.inventory_stock_sync', TRUE) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'RAW_MATERIAL_STOCK_REQUIRES_INVENTORY_TRANSACTION' USING ERRCODE = '42501';
  END IF;
  IF OLD.id IS DISTINCT FROM NEW.id
     OR OLD.business_id IS DISTINCT FROM NEW.business_id
     OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'RAW_MATERIAL_IDENTITY_IMMUTABLE' USING ERRCODE = '42501';
  END IF;
  IF (to_jsonb(OLD) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(NEW) - 'status' - 'updated_at')
     AND NOT public.has_business_permission(OLD.business_id, 'raw_materials.edit') THEN
    RAISE EXCEPTION 'FORBIDDEN: raw_materials.edit' USING ERRCODE = '42501';
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'INACTIVE'
       AND NOT public.has_business_permission(OLD.business_id, 'raw_materials.delete') THEN
      RAISE EXCEPTION 'FORBIDDEN: raw_materials.delete' USING ERRCODE = '42501';
    END IF;
    IF NEW.status = 'ACTIVE'
       AND NOT public.has_business_permission(OLD.business_id, 'raw_materials.edit') THEN
      RAISE EXCEPTION 'FORBIDDEN: raw_materials.edit' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_raw_material_initial_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.current_stock <> 0
     AND current_setting('app.inventory_stock_sync', TRUE) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'RAW_MATERIAL_OPENING_STOCK_REQUIRES_INVENTORY_TRANSACTION' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_raw_material_inventory_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE previous_setting TEXT := current_setting('app.inventory_stock_sync', TRUE);
BEGIN
  IF NEW.item_type <> 'raw_material' THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.raw_materials
    WHERE id = NEW.item_id AND business_id = NEW.business_id
  ) THEN
    RAISE EXCEPTION 'RAW_MATERIAL_INVENTORY_BUSINESS_MISMATCH';
  END IF;
  PERFORM set_config('app.inventory_stock_sync', 'on', TRUE);
  UPDATE public.raw_materials
  SET current_stock = NEW.current_stock
  WHERE id = NEW.item_id AND business_id = NEW.business_id;
  PERFORM set_config('app.inventory_stock_sync', COALESCE(previous_setting, ''), TRUE);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_raw_material_inventory_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inventory (business_id, item_type, item_id, current_stock, reserved_stock, available_stock)
  VALUES (NEW.business_id, 'raw_material', NEW.id, NEW.current_stock, 0, NEW.current_stock)
  ON CONFLICT (business_id, item_type, item_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER raw_materials_guard_stock_and_permissions
BEFORE UPDATE ON public.raw_materials
FOR EACH ROW EXECUTE FUNCTION public.guard_raw_material_stock_change();
CREATE TRIGGER raw_materials_guard_initial_stock
BEFORE INSERT ON public.raw_materials
FOR EACH ROW EXECUTE FUNCTION public.guard_raw_material_initial_stock();
CREATE TRIGGER raw_materials_create_inventory
AFTER INSERT ON public.raw_materials
FOR EACH ROW EXECUTE FUNCTION public.create_raw_material_inventory_row();
CREATE TRIGGER inventory_sync_raw_material_stock
AFTER INSERT OR UPDATE OF current_stock ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.sync_raw_material_inventory_stock();

CREATE OR REPLACE FUNCTION public.audit_raw_material_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE actor_id UUID;
BEGIN
  SELECT id INTO actor_id FROM public.users
  WHERE auth_user_id = auth.uid() AND business_id = COALESCE(NEW.business_id, OLD.business_id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, new_data)
    VALUES (NEW.business_id, actor_id, 'RAW_MATERIAL_CREATED', 'raw_material', NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;

  IF (to_jsonb(OLD) - 'current_stock' - 'updated_at') IS DISTINCT FROM (to_jsonb(NEW) - 'current_stock' - 'updated_at') THEN
    INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (
      NEW.business_id, actor_id,
      CASE WHEN OLD.status = 'ACTIVE' AND NEW.status = 'INACTIVE' THEN 'RAW_MATERIAL_DEACTIVATED'
           WHEN OLD.status = 'INACTIVE' AND NEW.status = 'ACTIVE' THEN 'RAW_MATERIAL_ACTIVATED'
           ELSE 'RAW_MATERIAL_EDITED' END,
      'raw_material', NEW.id, to_jsonb(OLD), to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_bom_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE actor_id UUID;
BEGIN
  SELECT id INTO actor_id FROM public.users
  WHERE auth_user_id = auth.uid() AND business_id = COALESCE(NEW.business_id, OLD.business_id);
  INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (
    COALESCE(NEW.business_id, OLD.business_id), actor_id,
    CASE WHEN TG_OP = 'INSERT' THEN 'BOM_CREATED' ELSE 'BOM_UPDATED' END,
    'product_bom', COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_bom_item_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE actor_id UUID;
BEGIN
  SELECT id INTO actor_id FROM public.users
  WHERE auth_user_id = auth.uid() AND business_id = COALESCE(NEW.business_id, OLD.business_id);
  INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (
    COALESCE(NEW.business_id, OLD.business_id), actor_id,
    CASE WHEN TG_OP = 'INSERT' THEN 'BOM_MATERIAL_ADDED'
         WHEN TG_OP = 'DELETE' THEN 'BOM_MATERIAL_REMOVED'
         ELSE 'BOM_MATERIAL_UPDATED' END,
    'bom_item', COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER raw_materials_audit_change
AFTER INSERT OR UPDATE ON public.raw_materials
FOR EACH ROW EXECUTE FUNCTION public.audit_raw_material_change();
CREATE TRIGGER raw_materials_touch_updated_at
BEFORE UPDATE ON public.raw_materials
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER product_bom_audit_change
AFTER INSERT OR UPDATE ON public.product_bom
FOR EACH ROW EXECUTE FUNCTION public.audit_bom_change();
CREATE TRIGGER product_bom_touch_updated_at
BEFORE UPDATE ON public.product_bom
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER bom_items_audit_change
AFTER INSERT OR UPDATE OR DELETE ON public.bom_items
FOR EACH ROW EXECUTE FUNCTION public.audit_bom_item_change();
CREATE TRIGGER bom_items_touch_updated_at
BEFORE UPDATE ON public.bom_items
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER inventory_touch_updated_at
BEFORE UPDATE ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.inventory (business_id, item_type, item_id, current_stock, reserved_stock, available_stock)
SELECT rm.business_id, 'raw_material', rm.id, rm.current_stock, 0, rm.current_stock
FROM public.raw_materials rm
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory i
  WHERE i.business_id = rm.business_id AND i.item_type = 'raw_material' AND i.item_id = rm.id
);

ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_bom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.raw_materials TO authenticated;
GRANT SELECT ON public.inventory, public.inventory_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.product_bom TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bom_items TO authenticated;
REVOKE DELETE ON public.raw_materials, public.inventory, public.inventory_transactions, public.product_bom FROM anon, authenticated;
GRANT ALL ON public.raw_materials, public.inventory, public.inventory_transactions, public.product_bom, public.bom_items TO service_role;

DO $$
DECLARE policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('raw_materials', 'inventory', 'inventory_transactions', 'product_bom', 'bom_items')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', policy_record.policyname, policy_record.tablename);
  END LOOP;
END;
$$;

CREATE POLICY raw_materials_select_business_view ON public.raw_materials
FOR SELECT USING (public.is_business_member(business_id) AND public.has_business_permission(business_id, 'raw_materials.view'));
CREATE POLICY raw_materials_insert_business_create ON public.raw_materials
FOR INSERT WITH CHECK (public.is_business_member(business_id) AND public.has_business_permission(business_id, 'raw_materials.create'));
CREATE POLICY raw_materials_update_business_edit_or_delete ON public.raw_materials
FOR UPDATE USING (
  public.is_business_member(business_id)
  AND (public.has_business_permission(business_id, 'raw_materials.edit') OR public.has_business_permission(business_id, 'raw_materials.delete'))
)
WITH CHECK (
  public.is_business_member(business_id)
  AND (public.has_business_permission(business_id, 'raw_materials.edit') OR public.has_business_permission(business_id, 'raw_materials.delete'))
);

CREATE POLICY inventory_select_business_view ON public.inventory
FOR SELECT USING (public.is_business_member(business_id) AND public.has_business_permission(business_id, 'inventory.view'));

CREATE POLICY inventory_transactions_select_business_history ON public.inventory_transactions
FOR SELECT USING (
  public.is_business_member(business_id)
  AND public.has_business_permission(business_id, 'inventory.view_history')
);

CREATE POLICY product_bom_select_business_product_view ON public.product_bom
FOR SELECT USING (public.is_business_member(business_id) AND public.has_business_permission(business_id, 'products.view'));
CREATE POLICY product_bom_insert_business_product_edit ON public.product_bom
FOR INSERT WITH CHECK (public.is_business_member(business_id) AND public.has_business_permission(business_id, 'products.edit'));
CREATE POLICY product_bom_update_business_product_edit ON public.product_bom
FOR UPDATE USING (public.is_business_member(business_id) AND public.has_business_permission(business_id, 'products.edit'))
WITH CHECK (public.is_business_member(business_id) AND public.has_business_permission(business_id, 'products.edit'));

CREATE POLICY bom_items_select_business_product_view ON public.bom_items
FOR SELECT USING (public.is_business_member(business_id) AND public.has_business_permission(business_id, 'products.view'));
CREATE POLICY bom_items_insert_business_product_edit ON public.bom_items
FOR INSERT WITH CHECK (public.is_business_member(business_id) AND public.has_business_permission(business_id, 'products.edit'));
CREATE POLICY bom_items_update_business_product_edit ON public.bom_items
FOR UPDATE USING (public.is_business_member(business_id) AND public.has_business_permission(business_id, 'products.edit'))
WITH CHECK (public.is_business_member(business_id) AND public.has_business_permission(business_id, 'products.edit'));
CREATE POLICY bom_items_delete_business_product_edit ON public.bom_items
FOR DELETE USING (public.is_business_member(business_id) AND public.has_business_permission(business_id, 'products.edit'));

INSERT INTO public.permissions (module, action, description) VALUES
  ('raw_materials', 'view', 'View raw materials'),
  ('raw_materials', 'create', 'Create raw materials'),
  ('raw_materials', 'edit', 'Edit raw material details'),
  ('raw_materials', 'delete', 'Deactivate raw materials'),
  ('inventory', 'view', 'View raw-material stock'),
  ('inventory', 'add_stock', 'Add raw-material stock'),
  ('inventory', 'adjust', 'Adjust raw-material stock'),
  ('inventory', 'view_history', 'View inventory transaction history')
ON CONFLICT (module, action) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.module = 'raw_materials'
WHERE replace(lower(trim(r.name)), ' ', '_') IN ('super_admin', 'admin', 'manager') AND p.action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.module = 'raw_materials'
WHERE replace(lower(trim(r.name)), ' ', '_') IN ('super_admin', 'admin') AND p.action IN ('create', 'edit')
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.module = 'raw_materials' AND p.action = 'delete'
WHERE replace(lower(trim(r.name)), ' ', '_') = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.module = 'inventory'
WHERE replace(lower(trim(r.name)), ' ', '_') = 'super_admin'
  AND p.action IN ('view', 'add_stock', 'adjust', 'view_history')
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.module = 'inventory'
WHERE replace(lower(trim(r.name)), ' ', '_') = 'admin'
  AND p.action IN ('view', 'add_stock', 'adjust')
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r JOIN public.permissions p ON p.module = 'inventory' AND p.action = 'view'
WHERE replace(lower(trim(r.name)), ' ', '_') = 'manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.record_raw_material_stock_in(
  target_business_id UUID,
  target_raw_material_id UUID,
  target_quantity NUMERIC,
  target_notes TEXT DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_stock NUMERIC(14, 3);
  new_stock NUMERIC(14, 3);
  actor_id UUID;
BEGIN
  IF NOT public.is_business_member(target_business_id)
     OR NOT public.has_business_permission(target_business_id, 'inventory.add_stock') THEN
    RAISE EXCEPTION 'FORBIDDEN: inventory.add_stock' USING ERRCODE = '42501';
  END IF;
  IF target_quantity IS NULL OR target_quantity <= 0 OR target_notes IS NOT NULL AND length(target_notes) > 500 THEN
    RAISE EXCEPTION 'INVALID_STOCK_ENTRY' USING ERRCODE = '23514';
  END IF;

  SELECT current_stock INTO old_stock FROM public.inventory
  WHERE business_id = target_business_id AND item_type = 'raw_material' AND item_id = target_raw_material_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'RAW_MATERIAL_NOT_FOUND'; END IF;

  SELECT id INTO actor_id FROM public.users
  WHERE auth_user_id = auth.uid() AND business_id = target_business_id AND status = 'ACTIVE';
  IF actor_id IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501'; END IF;

  new_stock := old_stock + target_quantity;
  UPDATE public.inventory
  SET current_stock = new_stock,
      available_stock = new_stock - reserved_stock
  WHERE business_id = target_business_id AND item_type = 'raw_material' AND item_id = target_raw_material_id;

  INSERT INTO public.inventory_transactions (
    business_id, item_type, item_id, transaction_type, quantity, reference_type, notes, created_by
  ) VALUES (
    target_business_id, 'raw_material', target_raw_material_id, 'STOCK_IN', target_quantity,
    'manual_stock_in', NULLIF(btrim(target_notes), ''), actor_id
  );
  INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (
    target_business_id, actor_id, 'RAW_MATERIAL_STOCK_ADDED', 'raw_material', target_raw_material_id,
    jsonb_build_object('current_stock', old_stock),
    jsonb_build_object('current_stock', new_stock, 'quantity_added', target_quantity, 'notes', target_notes)
  );
  RETURN new_stock;
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_raw_material_stock(
  target_business_id UUID,
  target_raw_material_id UUID,
  target_new_stock NUMERIC,
  target_reason TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_stock NUMERIC(14, 3);
  delta NUMERIC(14, 3);
  actor_id UUID;
BEGIN
  IF NOT public.is_business_member(target_business_id)
     OR NOT public.has_business_permission(target_business_id, 'inventory.adjust') THEN
    RAISE EXCEPTION 'FORBIDDEN: inventory.adjust' USING ERRCODE = '42501';
  END IF;
  IF target_new_stock IS NULL OR target_new_stock < 0
     OR NULLIF(btrim(target_reason), '') IS NULL OR length(target_reason) > 500 THEN
    RAISE EXCEPTION 'INVALID_STOCK_ADJUSTMENT' USING ERRCODE = '23514';
  END IF;

  SELECT current_stock INTO old_stock FROM public.inventory
  WHERE business_id = target_business_id AND item_type = 'raw_material' AND item_id = target_raw_material_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'RAW_MATERIAL_NOT_FOUND'; END IF;
  IF target_new_stock = old_stock THEN RAISE EXCEPTION 'STOCK_UNCHANGED'; END IF;

  SELECT id INTO actor_id FROM public.users
  WHERE auth_user_id = auth.uid() AND business_id = target_business_id AND status = 'ACTIVE';
  IF actor_id IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501'; END IF;

  delta := target_new_stock - old_stock;
  UPDATE public.inventory
  SET current_stock = target_new_stock,
      available_stock = target_new_stock - reserved_stock
  WHERE business_id = target_business_id AND item_type = 'raw_material' AND item_id = target_raw_material_id;

  INSERT INTO public.inventory_transactions (
    business_id, item_type, item_id, transaction_type, quantity, reference_type, notes, created_by
  ) VALUES (
    target_business_id, 'raw_material', target_raw_material_id, 'ADJUSTMENT', delta,
    'manual_adjustment', btrim(target_reason), actor_id
  );
  INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (
    target_business_id, actor_id, 'RAW_MATERIAL_STOCK_ADJUSTED', 'raw_material', target_raw_material_id,
    jsonb_build_object('current_stock', old_stock),
    jsonb_build_object('current_stock', target_new_stock, 'adjustment', delta, 'reason', btrim(target_reason))
  );
  RETURN target_new_stock;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_product_bom_active(
  target_business_id UUID,
  target_bom_id UUID,
  target_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE target_product_id UUID;
BEGIN
  IF NOT public.is_business_member(target_business_id)
     OR NOT public.has_business_permission(target_business_id, 'products.edit') THEN
    RAISE EXCEPTION 'FORBIDDEN: products.edit' USING ERRCODE = '42501';
  END IF;
  SELECT product_id INTO target_product_id FROM public.product_bom
  WHERE id = target_bom_id AND business_id = target_business_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOM_NOT_FOUND'; END IF;

  IF target_active THEN
    UPDATE public.product_bom SET active = FALSE
    WHERE business_id = target_business_id AND product_id = target_product_id AND active AND id <> target_bom_id;
  END IF;
  UPDATE public.product_bom SET active = target_active WHERE id = target_bom_id AND business_id = target_business_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_product_material_requirements(
  target_business_id UUID,
  target_product_id UUID,
  target_order_quantity NUMERIC
)
RETURNS TABLE (
  raw_material_id UUID,
  code TEXT,
  name TEXT,
  unit TEXT,
  quantity_per_unit NUMERIC,
  required_quantity NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF target_order_quantity IS NULL OR target_order_quantity <= 0 THEN
    RAISE EXCEPTION 'ORDER_QUANTITY_MUST_BE_POSITIVE' USING ERRCODE = '23514';
  END IF;
  IF NOT public.is_business_member(target_business_id)
     OR NOT public.has_business_permission(target_business_id, 'products.view')
     OR NOT public.has_business_permission(target_business_id, 'raw_materials.view') THEN
    RAISE EXCEPTION 'FORBIDDEN: BOM_VIEW' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT rm.id, rm.code, rm.name, rm.unit, bi.quantity_per_unit,
         (bi.quantity_per_unit * target_order_quantity)::NUMERIC
  FROM public.product_bom b
  JOIN public.bom_items bi ON bi.bom_id = b.id AND bi.business_id = b.business_id
  JOIN public.raw_materials rm ON rm.id = bi.raw_material_id AND rm.business_id = b.business_id
  WHERE b.business_id = target_business_id AND b.product_id = target_product_id AND b.active
  ORDER BY rm.name;
END;
$$;

REVOKE ALL ON FUNCTION public.record_raw_material_stock_in(UUID, UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_raw_material_stock_in(UUID, UUID, NUMERIC, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.adjust_raw_material_stock(UUID, UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_raw_material_stock(UUID, UUID, NUMERIC, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.set_product_bom_active(UUID, UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_product_bom_active(UUID, UUID, BOOLEAN) TO authenticated;
REVOKE ALL ON FUNCTION public.calculate_product_material_requirements(UUID, UUID, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_product_material_requirements(UUID, UUID, NUMERIC) TO authenticated;

COMMIT;