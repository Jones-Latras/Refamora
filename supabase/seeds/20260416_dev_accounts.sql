-- Dev-only seeded accounts for manual app testing.
-- Run this after the initial schema migration.
--
-- Login credentials:
-- farmer@agriwaste.test / Password123!
-- buyer@agriwaste.test  / Password123!

create extension if not exists pgcrypto;

do $$
declare
  farmer_id uuid := '11111111-1111-1111-1111-111111111111';
  buyer_id uuid := '22222222-2222-2222-2222-222222222222';
begin
  delete from auth.identities
  where user_id in (farmer_id, buyer_id);

  delete from auth.users
  where id in (farmer_id, buyer_id);

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    farmer_id,
    'authenticated',
    'authenticated',
    'farmer@agriwaste.test',
    crypt('Password123!', gen_salt('bf')),
    now(),
    now(),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object(
      'full_name',
      'Demo Farmer',
      'phone',
      '09170000001',
      'role',
      'farmer',
      'city',
      'Malaybalay'
    ),
    now(),
    now()
  );

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    buyer_id,
    'authenticated',
    'authenticated',
    'buyer@agriwaste.test',
    crypt('Password123!', gen_salt('bf')),
    now(),
    now(),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object(
      'full_name',
      'Demo Buyer',
      'phone',
      '09170000002',
      'role',
      'buyer',
      'city',
      'Cagayan de Oro'
    ),
    now(),
    now()
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider_id,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    farmer_id,
    jsonb_build_object(
      'sub',
      farmer_id::text,
      'email',
      'farmer@agriwaste.test',
      'email_verified',
      true
    ),
    'farmer@agriwaste.test',
    'email',
    now(),
    now(),
    now()
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider_id,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    buyer_id,
    jsonb_build_object(
      'sub',
      buyer_id::text,
      'email',
      'buyer@agriwaste.test',
      'email_verified',
      true
    ),
    'buyer@agriwaste.test',
    'email',
    now(),
    now(),
    now()
  );

end $$;
