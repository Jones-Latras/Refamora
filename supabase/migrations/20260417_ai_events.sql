create table if not exists public.ai_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  feature text not null
    check (feature in ('listing_copilot')),
  provider text
    check (provider in ('local_gemma', 'gemini')),
  fallback_used boolean not null default false,
  request_status text not null default 'success'
    check (request_status in ('success', 'error')),
  latency_ms integer
    check (latency_ms is null or latency_ms >= 0),
  helpful boolean,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_events_user_id_idx
  on public.ai_events (user_id);

create index if not exists ai_events_feature_created_at_idx
  on public.ai_events (feature, created_at desc);

alter table public.ai_events enable row level security;

drop policy if exists "Users can read own ai events" on public.ai_events;
create policy "Users can read own ai events"
  on public.ai_events
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own ai events" on public.ai_events;
create policy "Users can insert own ai events"
  on public.ai_events
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own ai events" on public.ai_events;
create policy "Users can update own ai events"
  on public.ai_events
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
