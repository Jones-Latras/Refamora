alter table public.users
  add column if not exists is_verified boolean not null default false;

create table if not exists public.seller_verification_requests (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  document_type text not null
    check (
      document_type in (
        'government_id',
        'farm_id',
        'business_permit',
        'cooperative_certificate',
        'other'
      )
    ),
  document_number text not null,
  notes text,
  document_path text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seller_verification_requests_seller_id_idx
  on public.seller_verification_requests (seller_id, created_at desc);

create index if not exists seller_verification_requests_status_created_idx
  on public.seller_verification_requests (status, created_at desc);

create unique index if not exists seller_verification_requests_one_pending_per_seller_idx
  on public.seller_verification_requests (seller_id)
  where status = 'pending';

alter table public.seller_verification_requests enable row level security;

drop policy if exists "Sellers can read own verification requests" on public.seller_verification_requests;
create policy "Sellers can read own verification requests"
  on public.seller_verification_requests
  for select
  to authenticated
  using (seller_id = auth.uid());

drop policy if exists "Sellers can create own verification requests" on public.seller_verification_requests;
create policy "Sellers can create own verification requests"
  on public.seller_verification_requests
  for insert
  to authenticated
  with check (seller_id = auth.uid());

drop policy if exists "Sellers can update pending verification requests" on public.seller_verification_requests;
create policy "Sellers can update pending verification requests"
  on public.seller_verification_requests
  for update
  to authenticated
  using (seller_id = auth.uid() and status = 'pending')
  with check (seller_id = auth.uid() and status = 'pending');

drop policy if exists "Admins can read all verification requests" on public.seller_verification_requests;
create policy "Admins can read all verification requests"
  on public.seller_verification_requests
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update all verification requests" on public.seller_verification_requests;
create policy "Admins can update all verification requests"
  on public.seller_verification_requests
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'verification-documents',
    'verification-documents',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners and admins can read verification documents" on storage.objects;
create policy "Owners and admins can read verification documents"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'verification-documents'
    and (owner = auth.uid() or public.is_admin())
  );

drop policy if exists "Authenticated upload verification documents" on storage.objects;
create policy "Authenticated upload verification documents"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'verification-documents');

drop policy if exists "Owners update verification documents" on storage.objects;
create policy "Owners update verification documents"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'verification-documents'
    and (owner = auth.uid() or public.is_admin())
  )
  with check (
    bucket_id = 'verification-documents'
    and (owner = auth.uid() or public.is_admin())
  );

drop policy if exists "Owners delete verification documents" on storage.objects;
create policy "Owners delete verification documents"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'verification-documents'
    and (owner = auth.uid() or public.is_admin())
  );
