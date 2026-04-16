-- Storage repair script for avatar and listing uploads.
-- Run this in Supabase SQL Editor if image uploads fail with bucket/policy errors.

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
