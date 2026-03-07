create table if not exists foods (
  id serial primary key,
  fdc_id integer unique not null,
  name text not null,
  emoji text,
  category text,
  calories numeric,
  protein_g numeric,
  fat_g numeric,
  carbs_g numeric,
  fiber_g numeric,
  sugar_g numeric,
  vitamin_c_mg numeric,
  iron_mg numeric,
  sodium_mg numeric,
  created_at timestamptz default now()
);

alter table foods enable row level security;

drop policy if exists "public read foods" on foods;
create policy "public read foods"
  on foods
  for select
  to anon
  using (true);

drop policy if exists "service role manage foods" on foods;
create policy "service role manage foods"
  on foods
  for all
  to service_role
  using (true)
  with check (true);
