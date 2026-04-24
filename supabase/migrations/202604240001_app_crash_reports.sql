create table if not exists public.app_crash_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  source text not null
    check (source in ('react_error_boundary', 'global_js_handler')),
  severity text not null
    check (severity in ('error', 'fatal')),
  message text not null,
  stack text,
  component_stack text,
  route text,
  app_env text not null
    check (app_env in ('development', 'staging', 'production')),
  app_version text,
  platform text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists app_crash_reports_created_at_idx
  on public.app_crash_reports (created_at desc);

create index if not exists app_crash_reports_source_created_at_idx
  on public.app_crash_reports (source, created_at desc);

create index if not exists app_crash_reports_user_id_created_at_idx
  on public.app_crash_reports (user_id, created_at desc);

alter table public.app_crash_reports enable row level security;

drop policy if exists "Anon and authenticated can insert app crash reports" on public.app_crash_reports;
create policy "Anon and authenticated can insert app crash reports"
  on public.app_crash_reports
  for insert
  to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "Admins can read app crash reports" on public.app_crash_reports;
create policy "Admins can read app crash reports"
  on public.app_crash_reports
  for select
  to authenticated
  using (public.is_admin());
