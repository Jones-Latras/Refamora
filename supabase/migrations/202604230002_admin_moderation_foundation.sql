alter table public.users drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role in ('farmer', 'buyer', 'admin'));

create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = coalesce(p_user_id, auth.uid())
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;

alter table public.listing_reports
  add column if not exists admin_note text,
  add column if not exists reviewed_by uuid references public.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.listing_review_queue
  add column if not exists admin_note text,
  add column if not exists reviewed_by uuid references public.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

drop policy if exists "Admins can read all listings" on public.listings;
create policy "Admins can read all listings"
  on public.listings
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update all listings" on public.listings;
create policy "Admins can update all listings"
  on public.listings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can read all listing reports" on public.listing_reports;
create policy "Admins can read all listing reports"
  on public.listing_reports
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update all listing reports" on public.listing_reports;
create policy "Admins can update all listing reports"
  on public.listing_reports
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can read all review queue items" on public.listing_review_queue;
create policy "Admins can read all review queue items"
  on public.listing_review_queue
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update all review queue items" on public.listing_review_queue;
create policy "Admins can update all review queue items"
  on public.listing_review_queue
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
