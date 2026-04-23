create table if not exists public.app_runtime_policies (
  id uuid primary key default gen_random_uuid(),
  environment text not null unique
    check (environment in ('development', 'staging', 'production')),
  minimum_supported_version text not null,
  is_enforced boolean not null default true,
  update_message text,
  ios_store_url text,
  android_store_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_runtime_policies_environment_idx
  on public.app_runtime_policies (environment);

alter table public.app_runtime_policies enable row level security;

drop policy if exists "Anon and authenticated can read app runtime policies" on public.app_runtime_policies;
create policy "Anon and authenticated can read app runtime policies"
  on public.app_runtime_policies
  for select
  to anon, authenticated
  using (true);

create or replace function public.handle_app_runtime_policies_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_app_runtime_policies_updated_at on public.app_runtime_policies;
create trigger on_app_runtime_policies_updated_at
  before update on public.app_runtime_policies
  for each row execute function public.handle_app_runtime_policies_updated_at();
