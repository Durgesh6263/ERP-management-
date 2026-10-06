BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  gst_number TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.is_business_member(target_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.business_id = target_business_id
      AND u.auth_user_id = auth.uid()
  );
$$;

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT roles_name_per_business_unique UNIQUE (business_id, name)
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT permissions_module_action_unique UNIQUE (module, action)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT business_settings_business_key_unique UNIQUE (business_id, key)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER businesses_touch_updated_at
BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER users_touch_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER roles_touch_updated_at
BEFORE UPDATE ON public.roles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER business_settings_touch_updated_at
BEFORE UPDATE ON public.business_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER user_permissions_touch_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "businesses_select_own_business" ON public.businesses
FOR SELECT USING ( auth.uid() IS NOT NULL AND is_business_member(id) );

CREATE POLICY "businesses_manage_service_role_only" ON public.businesses
FOR INSERT WITH CHECK (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
);

CREATE POLICY "businesses_update_own_business" ON public.businesses
FOR UPDATE USING ( auth.uid() IS NOT NULL AND is_business_member(id) )
WITH CHECK ( auth.uid() IS NOT NULL AND is_business_member(id) );

CREATE POLICY "businesses_delete_own_business" ON public.businesses
FOR DELETE USING ( auth.uid() IS NOT NULL AND is_business_member(id) );

CREATE POLICY "users_select_own_business" ON public.users
FOR SELECT USING ( auth.uid() IS NOT NULL AND is_business_member(business_id) );

CREATE POLICY "users_manage_service_role_only" ON public.users
FOR INSERT WITH CHECK (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
);

CREATE POLICY "users_update_own_business" ON public.users
FOR UPDATE USING ( auth.uid() IS NOT NULL AND is_business_member(business_id) )
WITH CHECK ( auth.uid() IS NOT NULL AND is_business_member(business_id) );

CREATE POLICY "roles_select_own_business" ON public.roles
FOR SELECT USING ( auth.uid() IS NOT NULL AND is_business_member(business_id) );

CREATE POLICY "roles_insert_own_business" ON public.roles
FOR INSERT WITH CHECK ( auth.uid() IS NOT NULL AND is_business_member(business_id) );

CREATE POLICY "roles_update_own_business" ON public.roles
FOR UPDATE USING ( auth.uid() IS NOT NULL AND is_business_member(business_id) )
WITH CHECK ( auth.uid() IS NOT NULL AND is_business_member(business_id) );

CREATE POLICY "roles_delete_own_business" ON public.roles
FOR DELETE USING ( auth.uid() IS NOT NULL AND is_business_member(business_id) );

CREATE POLICY "permissions_select_authenticated" ON public.permissions
FOR SELECT USING ( auth.uid() IS NOT NULL );

CREATE POLICY "permissions_manage_service_role_only" ON public.permissions
FOR INSERT WITH CHECK (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
);

CREATE POLICY "permissions_update_service_role_only" ON public.permissions
FOR UPDATE USING (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
);

CREATE POLICY "permissions_delete_service_role_only" ON public.permissions
FOR DELETE USING (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
);

CREATE POLICY "role_permissions_select_own_business" ON public.role_permissions
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.roles r
    WHERE r.id = role_permissions.role_id
      AND auth.uid() IS NOT NULL
      AND is_business_member(r.business_id)
  )
);

CREATE POLICY "role_permissions_manage_own_business" ON public.role_permissions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.roles r
    WHERE r.id = role_permissions.role_id
      AND auth.uid() IS NOT NULL
      AND is_business_member(r.business_id)
  )
);

CREATE POLICY "role_permissions_update_own_business" ON public.role_permissions
FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM public.roles r
    WHERE r.id = role_permissions.role_id
      AND auth.uid() IS NOT NULL
      AND is_business_member(r.business_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.roles r
    WHERE r.id = role_permissions.role_id
      AND auth.uid() IS NOT NULL
      AND is_business_member(r.business_id)
  )
);

CREATE POLICY "user_permissions_select_own_business" ON public.user_permissions
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = user_permissions.user_id
      AND auth.uid() IS NOT NULL
      AND is_business_member(u.business_id)
  )
);

CREATE POLICY "user_permissions_manage_own_business" ON public.user_permissions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = user_permissions.user_id
      AND auth.uid() IS NOT NULL
      AND is_business_member(u.business_id)
  )
);

CREATE POLICY "user_permissions_update_own_business" ON public.user_permissions
FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = user_permissions.user_id
      AND auth.uid() IS NOT NULL
      AND is_business_member(u.business_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = user_permissions.user_id
      AND auth.uid() IS NOT NULL
      AND is_business_member(u.business_id)
  )
);

CREATE POLICY "business_settings_select_own_business" ON public.business_settings
FOR SELECT USING ( auth.uid() IS NOT NULL AND is_business_member(business_id) );

CREATE POLICY "business_settings_insert_own_business" ON public.business_settings
FOR INSERT WITH CHECK ( auth.uid() IS NOT NULL AND is_business_member(business_id) );

CREATE POLICY "business_settings_update_own_business" ON public.business_settings
FOR UPDATE USING ( auth.uid() IS NOT NULL AND is_business_member(business_id) )
WITH CHECK ( auth.uid() IS NOT NULL AND is_business_member(business_id) );

CREATE POLICY "business_settings_delete_own_business" ON public.business_settings
FOR DELETE USING ( auth.uid() IS NOT NULL AND is_business_member(business_id) );

CREATE POLICY "audit_logs_select_own_business" ON public.audit_logs
FOR SELECT USING ( auth.uid() IS NOT NULL AND is_business_member(business_id) );

CREATE POLICY "audit_logs_insert_own_business" ON public.audit_logs
FOR INSERT WITH CHECK ( auth.uid() IS NOT NULL AND is_business_member(business_id) );

CREATE INDEX IF NOT EXISTS idx_users_business_id ON public.users (business_id);
CREATE INDEX IF NOT EXISTS idx_roles_business_id ON public.roles (business_id);
CREATE INDEX IF NOT EXISTS idx_business_settings_business_id ON public.business_settings (business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_id ON public.audit_logs (business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions (permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON public.user_permissions (permission_id);

COMMIT;
