begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'entitlements', 'entitlements table exists');
select has_table('public', 'weekly_plans', 'weekly plans table exists');
select has_table('public', 'shopping_list_items', 'shopping items table exists');

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'uno@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'dos@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'tres@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

insert into public.profiles (user_id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'uno@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'dos@example.com');

insert into public.user_preferences (
  user_id,
  people,
  enabled_meals,
  excluded_ingredient_ids
) values
  ('11111111-1111-4111-8111-111111111111', 2, '["breakfast","lunch"]', '[]'),
  ('22222222-2222-4222-8222-222222222222', 4, '["dinner"]', '["peanut"]');

insert into public.weekly_plans (
  id,
  user_id,
  week_start,
  people,
  generator_version,
  notices
) values
  (
    'week-user-one',
    '11111111-1111-4111-8111-111111111111',
    '2026-10-19',
    2,
    'planner-v1',
    '[]'
  ),
  (
    'week-user-two',
    '22222222-2222-4222-8222-222222222222',
    '2026-10-19',
    4,
    'planner-v1',
    '[]'
  );

insert into public.weekly_plan_items (
  weekly_plan_id,
  item_id,
  position,
  meal_date,
  meal_type,
  recipe_id,
  servings,
  replaced
) values
  ('week-user-one', 'one-breakfast', 0, '2026-10-19', 'breakfast', 'oats', 2, false),
  ('week-user-two', 'two-dinner', 0, '2026-10-19', 'dinner', 'soup', 4, false);

insert into public.shopping_list_items (
  weekly_plan_id,
  item_id,
  position,
  source,
  label,
  category,
  checked,
  ingredient_id,
  quantity,
  unit
) values
  ('week-user-one', 'generated:oats:g', 0, 'generated', 'Avena', 'pantry', false, 'oats', 100, 'g'),
  ('week-user-two', 'generated:tomato:g', 0, 'generated', 'Tomate', 'produce', false, 'tomato', 200, 'g');

set local role anon;
select is((select count(*)::integer from public.profiles), 0, 'anonymous users cannot read profiles');
select is((select count(*)::integer from public.weekly_plans), 0, 'anonymous users cannot read weeks');
reset role;

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.email', 'uno@example.com', true);
set local role authenticated;

select is((select count(*)::integer from public.profiles), 1, 'a user reads only their profile');
select is((select people from public.user_preferences), 2, 'a user reads only their preferences');
select is((select count(*)::integer from public.weekly_plans), 1, 'a user reads only their week');
select is((select count(*)::integer from public.weekly_plan_items), 1, 'a user reads only their planned meals');
select is((select count(*)::integer from public.shopping_list_items), 1, 'a user reads only their shopping rows');

select throws_ok(
  $$insert into public.user_preferences (user_id, people, enabled_meals, excluded_ingredient_ids)
    values ('33333333-3333-4333-8333-333333333333', 3, '["lunch"]', '[]')$$,
  '42501',
  'new row violates row-level security policy for table "user_preferences"',
  'cross-user preference inserts are denied'
);

select results_eq(
  $$update public.weekly_plans set people = 9
    where user_id = '22222222-2222-4222-8222-222222222222'
    returning people$$,
  $$values (null::integer) limit 0$$,
  'cross-user week updates affect no rows'
);

reset role;
set local role service_role;

select ok(
  public.process_hotmart_event(
    'event-approved',
    '2026-10-20T12:00:00Z',
    'PURCHASE_APPROVED',
    'transaction-one',
    'product-one',
    'buyer@example.com',
    'active'
  ),
  'the first Hotmart event is processed'
);

select is(
  public.process_hotmart_event(
    'event-approved',
    '2026-10-20T12:00:00Z',
    'PURCHASE_REFUNDED',
    'transaction-one',
    'product-one',
    'buyer@example.com',
    'revoked'
  ),
  false,
  'a duplicate event id is ignored'
);

select ok(
  public.process_hotmart_event(
    'event-older-refund',
    '2026-10-19T12:00:00Z',
    'PURCHASE_REFUNDED',
    'transaction-one',
    'product-one',
    'buyer@example.com',
    'revoked'
  ),
  'an older distinct event is recorded'
);

select is(
  (select status from public.entitlements where provider_transaction_id = 'transaction-one'),
  'active',
  'an older event cannot overwrite newer entitlement state'
);

select * from finish();
rollback;
