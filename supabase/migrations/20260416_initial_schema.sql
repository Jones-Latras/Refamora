create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text not null,
  phone text,
  role text check (role in ('farmer', 'buyer')),
  city text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  waste_type text not null,
  description text,
  quantity numeric not null,
  unit text not null,
  price numeric not null,
  accept_offers boolean not null default false,
  image_url text,
  address text,
  city text,
  latitude double precision,
  longitude double precision,
  fulfillment_type text not null default 'pickup'
    check (fulfillment_type in ('pickup', 'delivery', 'both')),
  status text not null default 'active'
    check (status in ('active', 'sold', 'unavailable')),
  created_at timestamptz not null default now()
);

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.users(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'seen')),
  created_at timestamptz not null default now()
);

create table if not exists public.waste_suggestions (
  id uuid primary key default gen_random_uuid(),
  waste_type text not null,
  suggested_use text not null
);

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
      when new.raw_user_meta_data->>'role' in ('farmer', 'buyer')
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
    city = coalesce(excluded.city, public.users.city),
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url);

  return new;
end;
$$;

create index if not exists listings_seller_id_idx on public.listings (seller_id);
create index if not exists listings_status_idx on public.listings (status);
create index if not exists listings_waste_type_idx on public.listings (waste_type);
create index if not exists contact_requests_listing_id_idx on public.contact_requests (listing_id);
create index if not exists contact_requests_buyer_id_idx on public.contact_requests (buyer_id);
create index if not exists contact_requests_seller_id_idx on public.contact_requests (seller_id);
create index if not exists waste_suggestions_waste_type_idx
  on public.waste_suggestions (waste_type);

alter table public.users enable row level security;
alter table public.listings enable row level security;
alter table public.contact_requests enable row level security;
alter table public.waste_suggestions enable row level security;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_auth_user_created();

drop policy if exists "Authenticated users can view profiles" on public.users;
drop policy if exists "Users can view own profile" on public.users;
create policy "Authenticated users can view profiles"
  on public.users
  for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
  on public.users
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Authenticated users can read active listings" on public.listings;
create policy "Authenticated users can read active listings"
  on public.listings
  for select
  to authenticated
  using (status = 'active' or seller_id = auth.uid());

drop policy if exists "Farmers can insert own listings" on public.listings;
create policy "Farmers can insert own listings"
  on public.listings
  for insert
  to authenticated
  with check (
    seller_id = auth.uid()
    and exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'farmer'
    )
  );

drop policy if exists "Farmers can update own listings" on public.listings;
create policy "Farmers can update own listings"
  on public.listings
  for update
  to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

drop policy if exists "Farmers can delete own listings" on public.listings;
create policy "Farmers can delete own listings"
  on public.listings
  for delete
  to authenticated
  using (seller_id = auth.uid());

drop policy if exists "Buyers and sellers can read related contact requests" on public.contact_requests;
create policy "Buyers and sellers can read related contact requests"
  on public.contact_requests
  for select
  to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid());

drop policy if exists "Buyers can create contact requests" on public.contact_requests;
create policy "Buyers can create contact requests"
  on public.contact_requests
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

drop policy if exists "Sellers can update their contact requests" on public.contact_requests;
create policy "Sellers can update their contact requests"
  on public.contact_requests
  for update
  to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

drop policy if exists "Authenticated users can read waste suggestions" on public.waste_suggestions;
create policy "Authenticated users can read waste suggestions"
  on public.waste_suggestions
  for select
  to authenticated
  using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-images', 'listing-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read listing images" on storage.objects;
create policy "Public read listing images"
  on storage.objects
  for select
  using (bucket_id = 'listing-images');

drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

drop policy if exists "Authenticated upload listing images" on storage.objects;
create policy "Authenticated upload listing images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'listing-images');

drop policy if exists "Authenticated upload avatars" on storage.objects;
create policy "Authenticated upload avatars"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'avatars');

drop policy if exists "Owners update listing images" on storage.objects;
create policy "Owners update listing images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'listing-images' and owner = auth.uid())
  with check (bucket_id = 'listing-images' and owner = auth.uid());

drop policy if exists "Owners update avatars" on storage.objects;
create policy "Owners update avatars"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid())
  with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists "Owners delete listing images" on storage.objects;
create policy "Owners delete listing images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'listing-images' and owner = auth.uid());

drop policy if exists "Owners delete avatars" on storage.objects;
create policy "Owners delete avatars"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());

insert into public.waste_suggestions (waste_type, suggested_use)
values
  ('coconut_husk', 'Coco coir fiber'),
  ('coconut_husk', 'Erosion control matting'),
  ('coconut_husk', 'Compost input'),
  ('coconut_husk', 'Handicraft material'),
  ('rice_straw', 'Mushroom growing substrate'),
  ('rice_straw', 'Animal feed (dry season)'),
  ('rice_straw', 'Mulch for vegetable beds'),
  ('corn_stalks', 'Biomass fuel'),
  ('corn_stalks', 'Silage for livestock'),
  ('banana_trunk', 'Fiber extraction'),
  ('banana_trunk', 'Paper pulp'),
  ('sugarcane_bagasse', 'Bioethanol production'),
  ('sugarcane_bagasse', 'Particleboard filler'),
  ('pineapple_leaves', 'Pina textile fiber'),
  ('pineapple_leaves', 'Compost accelerator')
on conflict do nothing;
