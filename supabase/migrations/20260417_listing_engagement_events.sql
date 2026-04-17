create table if not exists public.listing_engagement_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.users(id) on delete cascade,
  event_type text not null check (event_type in ('view')),
  created_at timestamptz not null default now()
);

create index if not exists listing_engagement_events_listing_id_idx
  on public.listing_engagement_events (listing_id);

create index if not exists listing_engagement_events_buyer_id_idx
  on public.listing_engagement_events (buyer_id);

create index if not exists listing_engagement_events_event_type_idx
  on public.listing_engagement_events (event_type);

alter table public.listing_engagement_events enable row level security;

drop policy if exists "Buyers can create own listing engagement events" on public.listing_engagement_events;
create policy "Buyers can create own listing engagement events"
  on public.listing_engagement_events
  for insert
  to authenticated
  with check (
    buyer_id = auth.uid()
    and exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'buyer'
    )
  );

drop policy if exists "Buyers can read own listing engagement events" on public.listing_engagement_events;
create policy "Buyers can read own listing engagement events"
  on public.listing_engagement_events
  for select
  to authenticated
  using (buyer_id = auth.uid());

drop policy if exists "Sellers can read engagement events for own listings" on public.listing_engagement_events;
create policy "Sellers can read engagement events for own listings"
  on public.listing_engagement_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.listings
      where listings.id = listing_engagement_events.listing_id
        and listings.seller_id = auth.uid()
    )
  );
