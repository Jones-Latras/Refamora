create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reporter_id uuid not null references public.users(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  reason text not null
    check (reason in ('inaccurate_details', 'suspicious_listing', 'wrong_photo', 'spam', 'other')),
  details text,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists listing_reports_listing_id_idx
  on public.listing_reports (listing_id);

create index if not exists listing_reports_seller_id_idx
  on public.listing_reports (seller_id);

create index if not exists listing_reports_status_created_idx
  on public.listing_reports (status, created_at desc);

alter table public.listing_reports enable row level security;

drop policy if exists "Users can create listing reports" on public.listing_reports;
create policy "Users can create listing reports"
  on public.listing_reports
  for insert
  to authenticated
  with check (
    reporter_id = auth.uid()
    and reporter_id <> seller_id
    and exists (
      select 1
      from public.listings
      where listings.id = listing_reports.listing_id
        and listings.seller_id = listing_reports.seller_id
    )
  );

drop policy if exists "Reporters can read own listing reports" on public.listing_reports;
create policy "Reporters can read own listing reports"
  on public.listing_reports
  for select
  to authenticated
  using (reporter_id = auth.uid());

drop policy if exists "Sellers can read reports for own listings" on public.listing_reports;
create policy "Sellers can read reports for own listings"
  on public.listing_reports
  for select
  to authenticated
  using (seller_id = auth.uid());
