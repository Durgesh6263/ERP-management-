INSERT INTO public.businesses (
  id,
  name,
  legal_name,
  gst_number,
  address,
  phone,
  email,
  currency,
  timezone,
  status
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  'Development Business',
  'Development Business Pvt. Ltd.',
  '27ABCDE1234F1Z5',
  'Bengaluru, India',
  '+91 98765 43210',
  'hello@development.local',
  'INR',
  'Asia/Kolkata',
  'ACTIVE'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.roles (id, business_id, name, description) VALUES
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Super Admin', 'Full platform access for the business owner.'),
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'Admin', 'Business administrator with broad management access.'),
  ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', 'Manager', 'Operational user with granular permission access.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.permissions (id, module, action, description) VALUES
  ('55555555-5555-4555-8555-555555555555', 'products', 'view', 'View products'),
  ('66666666-6666-4666-8666-666666666666', 'products', 'create', 'Create products'),
  ('77777777-7777-4777-8777-777777777777', 'products', 'edit', 'Edit products'),
  ('88888888-8888-4888-8888-888888888888', 'inventory', 'view', 'View inventory'),
  ('99999999-9999-4999-8999-999999999999', 'inventory', 'adjust', 'Adjust inventory'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'customers', 'view', 'View customers'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'orders', 'view', 'View orders'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'orders', 'approve', 'Approve orders'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'production', 'start', 'Start production'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'payments', 'view', 'View payments'),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'reports', 'view', 'View reports')
ON CONFLICT (module, action) DO NOTHING;
