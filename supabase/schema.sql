create table if not exists public.app_states (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_states enable row level security;

drop policy if exists "Allow read app states" on public.app_states;
create policy "Allow read app states"
on public.app_states
for select
to anon, authenticated
using (true);

drop policy if exists "Allow write app states" on public.app_states;
create policy "Allow write app states"
on public.app_states
for insert
to anon, authenticated
with check (true);

drop policy if exists "Allow update app states" on public.app_states;
create policy "Allow update app states"
on public.app_states
for update
to anon, authenticated
using (true)
with check (true);
