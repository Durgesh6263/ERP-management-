BEGIN;

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
    JOIN public.businesses b ON b.id = u.business_id
    WHERE u.business_id = target_business_id
      AND u.auth_user_id = auth.uid()
      AND u.status = 'ACTIVE'
      AND b.status = 'ACTIVE'
  );
$$;

ALTER TABLE public.users
  ADD CONSTRAINT users_id_business_unique UNIQUE (id, business_id);

ALTER TABLE public.roles
  ADD CONSTRAINT roles_id_business_unique UNIQUE (id, business_id);

CREATE TABLE public.user_roles (
  business_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id),
  FOREIGN KEY (user_id, business_id)
    REFERENCES public.users (id, business_id) ON DELETE CASCADE,
  FOREIGN KEY (role_id, business_id)
    REFERENCES public.roles (id, business_id) ON DELETE RESTRICT
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select_own_business" ON public.user_roles
FOR SELECT USING (auth.uid() IS NOT NULL AND is_business_member(business_id));

CREATE POLICY "user_roles_manage_service_role_only" ON public.user_roles
FOR ALL USING (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
)
WITH CHECK (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
);

DROP POLICY IF EXISTS "users_update_own_business" ON public.users;
CREATE POLICY "users_update_service_role_only" ON public.users
FOR UPDATE USING (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
)
WITH CHECK (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
);

DROP POLICY IF EXISTS "businesses_update_own_business" ON public.businesses;
DROP POLICY IF EXISTS "businesses_delete_own_business" ON public.businesses;
CREATE POLICY "businesses_mutate_service_role_only" ON public.businesses
FOR ALL USING (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
)
WITH CHECK (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
);

DROP POLICY IF EXISTS "roles_insert_own_business" ON public.roles;
DROP POLICY IF EXISTS "roles_update_own_business" ON public.roles;
DROP POLICY IF EXISTS "roles_delete_own_business" ON public.roles;
CREATE POLICY "roles_mutate_service_role_only" ON public.roles
FOR ALL USING (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
)
WITH CHECK (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
);

DROP POLICY IF EXISTS "role_permissions_manage_own_business" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_update_own_business" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_delete_own_business" ON public.role_permissions;
CREATE POLICY "role_permissions_mutate_service_role_only" ON public.role_permissions
FOR ALL USING (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
)
WITH CHECK (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
);

DROP POLICY IF EXISTS "user_permissions_manage_own_business" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_update_own_business" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_delete_own_business" ON public.user_permissions;
CREATE POLICY "user_permissions_mutate_service_role_only" ON public.user_permissions
FOR ALL USING (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
)
WITH CHECK (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
);

DROP POLICY IF EXISTS "audit_logs_insert_own_business" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_service_role_only" ON public.audit_logs
FOR INSERT WITH CHECK (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
);

CREATE INDEX idx_user_roles_business_id ON public.user_roles (business_id);
CREATE INDEX idx_user_roles_role_id ON public.user_roles (role_id);

INSERT INTO public.permissions (module, action, description)
VALUES ('users', 'manage', 'Invite users and change account status or role')
ON CONFLICT (module, action) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.module = 'users' AND p.action = 'manage'
WHERE lower(trim(r.name)) IN ('admin', 'super admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.module = 'users' AND p.action = 'manage'
WHERE lower(trim(r.name)) = 'manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.provision_user_account(
  target_business_id UUID,
  target_auth_user_id UUID,
  target_name TEXT,
  target_email TEXT,
  target_role_id UUID,
  actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_user_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.roles
    WHERE id = target_role_id AND business_id = target_business_id
  ) THEN
    RAISE EXCEPTION 'ROLE_NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = actor_user_id
      AND business_id = target_business_id
      AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'ACTOR_NOT_FOUND';
  END IF;

  INSERT INTO public.users (business_id, auth_user_id, name, email, status)
  VALUES (target_business_id, target_auth_user_id, trim(target_name), lower(trim(target_email)), 'ACTIVE')
  RETURNING id INTO created_user_id;

  INSERT INTO public.user_roles (business_id, user_id, role_id)
  VALUES (target_business_id, created_user_id, target_role_id);

  INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, new_data)
  VALUES (
    target_business_id,
    actor_user_id,
    'USER_INVITED',
    'user',
    created_user_id,
    jsonb_build_object('name', trim(target_name), 'email', lower(trim(target_email)), 'role_id', target_role_id)
  );

  RETURN created_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_managed_user_account(
  target_user_id UUID,
  target_role_id UUID,
  target_status TEXT,
  actor_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_record RECORD;
BEGIN
  SELECT u.business_id, u.status, ur.role_id
  INTO account_record
  FROM public.users u
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE u.id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.roles
    WHERE id = target_role_id AND business_id = account_record.business_id
  ) THEN
    RAISE EXCEPTION 'ROLE_NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = actor_user_id
      AND business_id = account_record.business_id
      AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'ACTOR_NOT_FOUND';
  END IF;

  UPDATE public.users SET status = target_status WHERE id = target_user_id;

  INSERT INTO public.user_roles (business_id, user_id, role_id)
  VALUES (account_record.business_id, target_user_id, target_role_id)
  ON CONFLICT (user_id) DO UPDATE SET role_id = EXCLUDED.role_id;

  INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (
    account_record.business_id,
    actor_user_id,
    'USER_ACCOUNT_UPDATED',
    'user',
    target_user_id,
    jsonb_build_object('status', account_record.status, 'role_id', account_record.role_id),
    jsonb_build_object('status', target_status, 'role_id', target_role_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.provision_user_account(UUID, UUID, TEXT, TEXT, UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_user_account(UUID, UUID, TEXT, TEXT, UUID, UUID)
  TO service_role;

REVOKE ALL ON FUNCTION public.update_managed_user_account(UUID, UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_managed_user_account(UUID, UUID, TEXT, UUID)
  TO service_role;

COMMIT;