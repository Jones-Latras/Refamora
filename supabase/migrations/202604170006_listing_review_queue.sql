create table if not exists public.listing_review_queue (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  ai_event_id uuid references public.ai_events(id) on delete set null,
  decision text not null check (decision in ('review', 'block')),
  queue_status text not null default 'pending'
    check (queue_status in ('pending', 'resolved', 'dismissed')),
  title text not null,
  waste_type text,
  city text,
  reasons jsonb not null default '[]'::jsonb,
  field_warnings jsonb not null default '[]'::jsonb,
  image_warnings jsonb not null default '[]'::jsonb,
  listing_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listing_review_queue_seller_id_idx
  on public.listing_review_queue (seller_id);

create index if not exists listing_review_queue_status_created_idx
  on public.listing_review_queue (queue_status, created_at desc);

alter table public.listing_review_queue enable row level security;

drop policy if exists "Sellers can read own review queue items" on public.listing_review_queue;
create policy "Sellers can read own review queue items"
  on public.listing_review_queue
  for select
  to authenticated
  using (seller_id = auth.uid());

drop policy if exists "Sellers can insert own review queue items" on public.listing_review_queue;
create policy "Sellers can insert own review queue items"
  on public.listing_review_queue
  for insert
  to authenticated
  with check (seller_id = auth.uid());
