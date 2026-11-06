alter table public.weekly_plans
  add column if not exists title text,
  add column if not exists saved_at timestamptz;

alter table public.weekly_plans
  drop constraint if exists weekly_plans_saved_metadata_check;

alter table public.weekly_plans
  add constraint weekly_plans_saved_metadata_check check (
    (title is null and saved_at is null)
    or
    (
      title is not null
      and saved_at is not null
      and title = btrim(title)
      and char_length(title) between 1 and 60
    )
  );

create index if not exists weekly_plans_saved_idx
  on public.weekly_plans (user_id, saved_at desc)
  where saved_at is not null;

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
  v_title text;
  v_saved_at timestamptz;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'planner user mismatch' using errcode = '42501';
  end if;

  select plan.title, plan.saved_at
  into v_title, v_saved_at
  from public.weekly_plans plan
  where plan.user_id = p_user_id
    and plan.week_start = (p_plan->>'weekStart')::date;

  delete from public.weekly_plans
  where user_id = p_user_id
    and week_start = (p_plan->>'weekStart')::date
    and id <> v_plan_id;

  insert into public.weekly_plans (
    id, user_id, week_start, people, generator_version, notices,
    title, saved_at, updated_at
  ) values (
    v_plan_id,
    p_user_id,
    (p_plan->>'weekStart')::date,
    (p_plan->>'people')::integer,
    p_plan->>'generatorVersion',
    coalesce(p_plan->'notices', '[]'::jsonb),
    v_title,
    v_saved_at,
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
    weekly_plan_id, item_id, position, source, label, category, checked,
    ingredient_id, quantity, unit, unit_label, customized, hidden, includes_to_taste
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
    item->>'unitLabel',
    coalesce((item->>'customized')::boolean, false),
    coalesce((item->>'hidden')::boolean, false),
    coalesce((item->>'includesToTaste')::boolean, false)
  from jsonb_array_elements(coalesce(p_shopping_items, '[]'::jsonb))
    with ordinality as entries(item, ordinality);
end;
$$;

create or replace function public.list_saved_planner_weeks(
  p_user_id uuid
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

  select coalesce(jsonb_agg(jsonb_build_object(
    'weekStart', to_char(plan.week_start, 'YYYY-MM-DD'),
    'title', plan.title,
    'savedAt', to_char(plan.saved_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'people', plan.people,
    'mealCount', (select count(*) from public.weekly_plan_items item where item.weekly_plan_id = plan.id),
    'previewRecipeId', (select item.recipe_id from public.weekly_plan_items item where item.weekly_plan_id = plan.id order by item.position limit 1)
  ) order by plan.saved_at desc), '[]'::jsonb)
  into v_result
  from public.weekly_plans plan
  where plan.user_id = p_user_id and plan.saved_at is not null;

  return v_result;
end;
$$;

create or replace function public.save_planner_week_to_library(
  p_user_id uuid,
  p_week_start date,
  p_title text
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'planner user mismatch' using errcode = '42501';
  end if;

  update public.weekly_plans
  set title = btrim(p_title), saved_at = coalesce(saved_at, now()), updated_at = now()
  where user_id = p_user_id and week_start = p_week_start;

  select item into v_result
  from jsonb_array_elements(public.list_saved_planner_weeks(p_user_id)) item
  where item->>'weekStart' = to_char(p_week_start, 'YYYY-MM-DD');
  return v_result;
end;
$$;

create or replace function public.rename_saved_planner_week(
  p_user_id uuid,
  p_week_start date,
  p_title text
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'planner user mismatch' using errcode = '42501';
  end if;

  update public.weekly_plans
  set title = btrim(p_title), updated_at = now()
  where user_id = p_user_id and week_start = p_week_start and saved_at is not null;

  select item into v_result
  from jsonb_array_elements(public.list_saved_planner_weeks(p_user_id)) item
  where item->>'weekStart' = to_char(p_week_start, 'YYYY-MM-DD');
  return v_result;
end;
$$;

create or replace function public.delete_saved_planner_week(
  p_user_id uuid,
  p_week_start date
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_deleted_count integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'planner user mismatch' using errcode = '42501';
  end if;

  delete from public.weekly_plans
  where user_id = p_user_id and week_start = p_week_start and saved_at is not null;
  get diagnostics v_deleted_count = row_count;
  return v_deleted_count > 0;
end;
$$;

revoke all on function public.list_saved_planner_weeks(uuid) from public;
revoke all on function public.save_planner_week_to_library(uuid, date, text) from public;
revoke all on function public.rename_saved_planner_week(uuid, date, text) from public;
revoke all on function public.delete_saved_planner_week(uuid, date) from public;

grant execute on function public.list_saved_planner_weeks(uuid) to authenticated;
grant execute on function public.save_planner_week_to_library(uuid, date, text) to authenticated;
grant execute on function public.rename_saved_planner_week(uuid, date, text) to authenticated;
grant execute on function public.delete_saved_planner_week(uuid, date) to authenticated;
