alter table public.shopping_list_items
  add column if not exists customized boolean not null default false,
  add column if not exists hidden boolean not null default false,
  add column if not exists includes_to_taste boolean not null default false;

alter table public.shopping_list_items
  drop constraint if exists shopping_list_items_check;

alter table public.shopping_list_items
  drop constraint if exists shopping_list_items_shape_check;

alter table public.shopping_list_items
  add constraint shopping_list_items_shape_check check (
    (
      source = 'generated'
      and ingredient_id is not null
      and unit in ('g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'unit', 'pinch', 'to_taste')
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
    unit_label,
    customized,
    hidden,
    includes_to_taste
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
            'checked', shopping.checked,
            'customized', shopping.customized,
            'hidden', shopping.hidden,
            'includesToTaste', shopping.includes_to_taste
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
