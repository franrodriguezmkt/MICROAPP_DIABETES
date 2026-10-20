create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique check (email = lower(btrim(email))),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.entitlements (
  id uuid primary key default extensions.gen_random_uuid(),
  provider text not null default 'hotmart' check (provider = 'hotmart'),
  provider_transaction_id text not null,
  product_ucode text not null,
  status text not null check (status in ('active', 'revoked')),
  buyer_email text not null check (buyer_email = lower(btrim(buyer_email))),
  user_id uuid references auth.users(id) on delete set null,
  event_created_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_transaction_id)
);

create index entitlements_email_status_idx
  on public.entitlements (buyer_email, status);
create index entitlements_user_status_idx
  on public.entitlements (user_id, status);

create table public.webhook_events (
  event_id text primary key,
  event_type text not null,
  provider_transaction_id text not null,
  product_ucode text not null,
  event_created_at timestamptz not null,
  processed_at timestamptz not null default now()
);

create table public.access_attempts (
  subject_hash text not null,
  origin_hash text not null,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 1 check (attempt_count > 0),
  updated_at timestamptz not null default now(),
  primary key (subject_hash, origin_hash)
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  people integer not null check (people between 1 and 12),
  enabled_meals jsonb not null check (
    jsonb_typeof(enabled_meals) = 'array'
    and jsonb_array_length(enabled_meals) > 0
  ),
  excluded_ingredient_ids jsonb not null default '[]'::jsonb check (
    jsonb_typeof(excluded_ingredient_ids) = 'array'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weekly_plans (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  people integer not null check (people between 1 and 12),
  generator_version text not null,
  notices jsonb not null default '[]'::jsonb check (jsonb_typeof(notices) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index weekly_plans_user_week_idx
  on public.weekly_plans (user_id, week_start desc);

create table public.weekly_plan_items (
  weekly_plan_id text not null references public.weekly_plans(id) on delete cascade,
  item_id text not null,
  position integer not null check (position >= 0),
  meal_date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id text not null,
  servings integer not null check (servings between 1 and 12),
  replaced boolean not null default false,
  primary key (weekly_plan_id, item_id),
  unique (weekly_plan_id, position)
);

create table public.shopping_list_items (
  weekly_plan_id text not null references public.weekly_plans(id) on delete cascade,
  item_id text not null,
  position integer not null check (position >= 0),
  source text not null check (source in ('generated', 'manual')),
  label text not null check (length(btrim(label)) > 0),
  category text not null check (
    category in ('produce', 'protein', 'dairy', 'pantry', 'bakery', 'frozen', 'other')
  ),
  checked boolean not null default false,
  ingredient_id text,
  quantity numeric,
  unit text,
  unit_label text,
  primary key (weekly_plan_id, item_id),
  unique (weekly_plan_id, position),
  check (
    (
      source = 'generated'
      and ingredient_id is not null
      and unit in ('g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'unit', 'slice', 'to_taste')
      and ((unit = 'to_taste' and quantity is null) or (unit <> 'to_taste' and quantity > 0))
      and unit_label is null
    )
    or
    (
      source = 'manual'
      and ingredient_id is null
      and unit is null
      and (quantity is null or quantity > 0)
    )
  )
);

alter table public.profiles enable row level security;
alter table public.entitlements enable row level security;
alter table public.webhook_events enable row level security;
alter table public.access_attempts enable row level security;
alter table public.user_preferences enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.weekly_plan_items enable row level security;
alter table public.shopping_list_items enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.entitlements from anon, authenticated;
revoke all on public.webhook_events from anon, authenticated;
revoke all on public.access_attempts from anon, authenticated;
revoke all on public.user_preferences from anon, authenticated;
revoke all on public.weekly_plans from anon, authenticated;
revoke all on public.weekly_plan_items from anon, authenticated;
revoke all on public.shopping_list_items from anon, authenticated;

grant select on public.profiles, public.weekly_plans to anon;
grant select on public.profiles, public.entitlements to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, update, delete on public.weekly_plans to authenticated;
grant select, insert, update, delete on public.weekly_plan_items to authenticated;
grant select, insert, update, delete on public.shopping_list_items to authenticated;
grant select on public.entitlements to service_role;

create policy profiles_select_own on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy entitlements_select_own on public.entitlements
  for select to authenticated using (user_id = (select auth.uid()));

create policy preferences_select_own on public.user_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy preferences_insert_own on public.user_preferences
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy preferences_update_own on public.user_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy preferences_delete_own on public.user_preferences
  for delete to authenticated using (user_id = (select auth.uid()));

create policy weekly_plans_select_own on public.weekly_plans
  for select to authenticated using (user_id = (select auth.uid()));
create policy weekly_plans_insert_own on public.weekly_plans
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy weekly_plans_update_own on public.weekly_plans
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy weekly_plans_delete_own on public.weekly_plans
  for delete to authenticated using (user_id = (select auth.uid()));

create policy weekly_plan_items_select_own on public.weekly_plan_items
  for select to authenticated using (
    exists (
      select 1 from public.weekly_plans
      where weekly_plans.id = weekly_plan_items.weekly_plan_id
        and weekly_plans.user_id = (select auth.uid())
    )
  );
create policy weekly_plan_items_insert_own on public.weekly_plan_items
  for insert to authenticated with check (
    exists (
      select 1 from public.weekly_plans
      where weekly_plans.id = weekly_plan_items.weekly_plan_id
        and weekly_plans.user_id = (select auth.uid())
    )
  );
create policy weekly_plan_items_update_own on public.weekly_plan_items
  for update to authenticated
  using (
    exists (
      select 1 from public.weekly_plans
      where weekly_plans.id = weekly_plan_items.weekly_plan_id
        and weekly_plans.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.weekly_plans
      where weekly_plans.id = weekly_plan_items.weekly_plan_id
        and weekly_plans.user_id = (select auth.uid())
    )
  );
create policy weekly_plan_items_delete_own on public.weekly_plan_items
  for delete to authenticated using (
    exists (
      select 1 from public.weekly_plans
      where weekly_plans.id = weekly_plan_items.weekly_plan_id
        and weekly_plans.user_id = (select auth.uid())
    )
  );

create policy shopping_items_select_own on public.shopping_list_items
  for select to authenticated using (
    exists (
      select 1 from public.weekly_plans
      where weekly_plans.id = shopping_list_items.weekly_plan_id
        and weekly_plans.user_id = (select auth.uid())
    )
  );
create policy shopping_items_insert_own on public.shopping_list_items
  for insert to authenticated with check (
    exists (
      select 1 from public.weekly_plans
      where weekly_plans.id = shopping_list_items.weekly_plan_id
        and weekly_plans.user_id = (select auth.uid())
    )
  );
create policy shopping_items_update_own on public.shopping_list_items
  for update to authenticated
  using (
    exists (
      select 1 from public.weekly_plans
      where weekly_plans.id = shopping_list_items.weekly_plan_id
        and weekly_plans.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.weekly_plans
      where weekly_plans.id = shopping_list_items.weekly_plan_id
        and weekly_plans.user_id = (select auth.uid())
    )
  );
create policy shopping_items_delete_own on public.shopping_list_items
  for delete to authenticated using (
    exists (
      select 1 from public.weekly_plans
      where weekly_plans.id = shopping_list_items.weekly_plan_id
        and weekly_plans.user_id = (select auth.uid())
    )
  );

create or replace function public.save_planner_week_snapshot(
  p_user_id uuid,
  p_plan jsonb,
  p_shopping_items jsonb
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_plan_id text := p_plan->>'id';
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'planner user mismatch' using errcode = '42501';
  end if;

  delete from public.weekly_plans
  where user_id = p_user_id
    and week_start = (p_plan->>'weekStart')::date
    and id <> v_plan_id;

  insert into public.weekly_plans (
    id, user_id, week_start, people, generator_version, notices, updated_at
  ) values (
    v_plan_id,
    p_user_id,
    (p_plan->>'weekStart')::date,
    (p_plan->>'people')::integer,
    p_plan->>'generatorVersion',
    coalesce(p_plan->'notices', '[]'::jsonb),
    now()
  )
  on conflict (id) do update set
    people = excluded.people,
    generator_version = excluded.generator_version,
    notices = excluded.notices,
    updated_at = now();

  delete from public.weekly_plan_items where weekly_plan_id = v_plan_id;
  insert into public.weekly_plan_items (
    weekly_plan_id, item_id, position, meal_date, meal_type, recipe_id, servings, replaced
  )
  select
    v_plan_id,
    item->>'id',
    ordinality::integer - 1,
    (item->>'date')::date,
    item->>'mealType',
    item->>'recipeId',
    (item->>'servings')::integer,
    (item->>'replaced')::boolean
  from jsonb_array_elements(coalesce(p_plan->'items', '[]'::jsonb))
    with ordinality as entries(item, ordinality);

  delete from public.shopping_list_items where weekly_plan_id = v_plan_id;
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
    unit,
    unit_label
  )
  select
    v_plan_id,
    item->>'id',
    ordinality::integer - 1,
    item->>'source',
    item->>'label',
    item->>'category',
    (item->>'checked')::boolean,
    item->>'ingredientId',
    case when item ? 'quantity' and item->>'quantity' is not null
      then (item->>'quantity')::numeric else null end,
    item->>'unit',
    item->>'unitLabel'
  from jsonb_array_elements(coalesce(p_shopping_items, '[]'::jsonb))
    with ordinality as entries(item, ordinality);
end;
$$;

create or replace function public.get_planner_week_snapshot(
  p_user_id uuid,
  p_week_start date
) returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'planner user mismatch' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'plan', jsonb_build_object(
      'id', plan.id,
      'weekStart', to_char(plan.week_start, 'YYYY-MM-DD'),
      'people', plan.people,
      'generatorVersion', plan.generator_version,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', item.item_id,
          'date', to_char(item.meal_date, 'YYYY-MM-DD'),
          'mealType', item.meal_type,
          'recipeId', item.recipe_id,
          'servings', item.servings,
          'replaced', item.replaced
        ) order by item.position)
        from public.weekly_plan_items item
        where item.weekly_plan_id = plan.id
      ), '[]'::jsonb),
      'notices', plan.notices
    ),
    'shoppingItems', coalesce((
      select jsonb_agg(
        case when shopping.source = 'generated' then
          jsonb_build_object(
            'source', shopping.source,
            'id', shopping.item_id,
            'ingredientId', shopping.ingredient_id,
            'label', shopping.label,
            'quantity', shopping.quantity,
            'unit', shopping.unit,
            'category', shopping.category,
            'checked', shopping.checked
          )
        else
          jsonb_strip_nulls(jsonb_build_object(
            'source', shopping.source,
            'id', shopping.item_id,
            'label', shopping.label,
            'quantity', shopping.quantity,
            'unitLabel', shopping.unit_label,
            'category', shopping.category,
            'checked', shopping.checked
          ))
        end
        order by shopping.position
      )
      from public.shopping_list_items shopping
      where shopping.weekly_plan_id = plan.id
    ), '[]'::jsonb)
  ) into v_result
  from public.weekly_plans plan
  where plan.user_id = p_user_id and plan.week_start = p_week_start;

  return v_result;
end;
$$;

create or replace function public.list_planner_week_snapshots(
  p_user_id uuid
) returns setof jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_week_start date;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'planner user mismatch' using errcode = '42501';
  end if;

  for v_week_start in
    select week_start
    from public.weekly_plans
    where user_id = p_user_id
    order by week_start
  loop
    return next public.get_planner_week_snapshot(p_user_id, v_week_start);
  end loop;
end;
$$;

create or replace function public.claim_active_entitlement(
  p_email text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or v_email = '' or v_email <> lower(coalesce(auth.jwt()->>'email', '')) then
    return false;
  end if;

  insert into public.profiles (user_id, email, updated_at)
  values (v_user_id, v_email, now())
  on conflict (user_id) do update set email = excluded.email, updated_at = now();

  update public.entitlements
  set user_id = v_user_id, updated_at = now()
  where buyer_email = v_email and status = 'active' and user_id is null;

  return exists (
    select 1 from public.entitlements
    where buyer_email = v_email and status = 'active' and user_id = v_user_id
  );
end;
$$;

create or replace function public.process_hotmart_event(
  p_event_id text,
  p_event_created_at timestamptz,
  p_event_type text,
  p_provider_transaction_id text,
  p_product_ucode text,
  p_buyer_email text,
  p_status text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer;
  v_email text := lower(btrim(p_buyer_email));
begin
  if p_status not in ('active', 'revoked') or v_email = '' then
    raise exception 'invalid entitlement event' using errcode = '22023';
  end if;

  insert into public.webhook_events (
    event_id,
    event_type,
    provider_transaction_id,
    product_ucode,
    event_created_at
  ) values (
    p_event_id,
    p_event_type,
    p_provider_transaction_id,
    p_product_ucode,
    p_event_created_at
  ) on conflict (event_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false;
  end if;

  insert into public.entitlements (
    provider,
    provider_transaction_id,
    product_ucode,
    status,
    buyer_email,
    event_created_at
  ) values (
    'hotmart',
    p_provider_transaction_id,
    p_product_ucode,
    p_status,
    v_email,
    p_event_created_at
  )
  on conflict (provider, provider_transaction_id) do update set
    product_ucode = excluded.product_ucode,
    status = excluded.status,
    buyer_email = excluded.buyer_email,
    user_id = case
      when public.entitlements.buyer_email = excluded.buyer_email
        then public.entitlements.user_id
      else null
    end,
    event_created_at = excluded.event_created_at,
    updated_at = now()
  where excluded.event_created_at >= public.entitlements.event_created_at;

  return true;
end;
$$;

create or replace function public.consume_access_attempt(
  p_subject_hash text,
  p_origin_hash text,
  p_max_attempts integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempts integer;
begin
  if p_max_attempts < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit' using errcode = '22023';
  end if;

  delete from public.access_attempts
  where updated_at < now() - interval '1 day';

  insert into public.access_attempts (
    subject_hash, origin_hash, window_started_at, attempt_count, updated_at
  ) values (
    p_subject_hash, p_origin_hash, now(), 1, now()
  )
  on conflict (subject_hash, origin_hash) do update set
    window_started_at = case
      when public.access_attempts.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now()
      else public.access_attempts.window_started_at
    end,
    attempt_count = case
      when public.access_attempts.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then 1
      else public.access_attempts.attempt_count + 1
    end,
    updated_at = now()
  returning attempt_count into v_attempts;

  return v_attempts <= p_max_attempts;
end;
$$;

revoke all on function public.claim_active_entitlement(text) from public, anon;
revoke all on function public.process_hotmart_event(text, timestamptz, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.consume_access_attempt(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.save_planner_week_snapshot(uuid, jsonb, jsonb) from public, anon;
revoke all on function public.get_planner_week_snapshot(uuid, date) from public, anon;
revoke all on function public.list_planner_week_snapshots(uuid) from public, anon;

grant execute on function public.claim_active_entitlement(text) to authenticated;
grant execute on function public.process_hotmart_event(text, timestamptz, text, text, text, text, text) to service_role;
grant execute on function public.consume_access_attempt(text, text, integer, integer) to service_role;
grant execute on function public.save_planner_week_snapshot(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.get_planner_week_snapshot(uuid, date) to authenticated;
grant execute on function public.list_planner_week_snapshots(uuid) to authenticated;
