alter table public.users drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role in ('farmer', 'buyer', 'admin'));

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    full_name,
    phone,
    role,
    city,
    avatar_url
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    new.raw_user_meta_data->>'phone',
    case
      when new.raw_user_meta_data->>'role' in ('farmer', 'buyer', 'admin')
        then new.raw_user_meta_data->>'role'
      else null
    end,
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name),
    phone = coalesce(excluded.phone, public.users.phone),
    role = coalesce(excluded.role, public.users.role),
    city = coalesce(excluded.city, public.users.city),
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url);

  return new;
end;
$$;

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
