create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.users(id) on delete cascade,
  action_type text not null
    check (action_type in (
      'listing_report_updated',
      'review_queue_updated',
      'listing_status_updated',
      'seller_verification_updated'
    )),
  entity_type text not null
    check (entity_type in (
      'listing_report',
      'listing_review_queue',
      'listing',
      'seller_verification_request'
    )),
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_action_logs_admin_id_created_at_idx
  on public.admin_action_logs (admin_id, created_at desc);

create index if not exists admin_action_logs_entity_type_entity_id_idx
  on public.admin_action_logs (entity_type, entity_id, created_at desc);

alter table public.admin_action_logs enable row level security;

drop policy if exists "Admins can read audit logs" on public.admin_action_logs;
create policy "Admins can read audit logs"
  on public.admin_action_logs
  for select
  to authenticated
  using (public.is_admin());

create or replace function public.log_admin_audit_event(
  p_action_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_log_id uuid;
begin
  if v_admin_id is null or not public.is_admin(v_admin_id) then
    return null;
  end if;

  insert into public.admin_action_logs (
    admin_id,
    action_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_admin_id,
    p_action_type,
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_log_id;

  return v_log_id;
end;
$$;

create or replace function public.handle_listing_report_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.status is distinct from old.status
    or new.admin_note is distinct from old.admin_note
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at then
    perform public.log_admin_audit_event(
      'listing_report_updated',
      'listing_report',
      new.id,
      jsonb_build_object(
        'listing_id', new.listing_id,
        'seller_id', new.seller_id,
        'previous_status', old.status,
        'next_status', new.status,
        'reviewed_by', new.reviewed_by
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_listing_report_audit_log on public.listing_reports;
create trigger on_listing_report_audit_log
  after update on public.listing_reports
  for each row execute function public.handle_listing_report_audit_log();

create or replace function public.handle_listing_review_queue_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.queue_status is distinct from old.queue_status
    or new.admin_note is distinct from old.admin_note
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at then
    perform public.log_admin_audit_event(
      'review_queue_updated',
      'listing_review_queue',
      new.id,
      jsonb_build_object(
        'listing_id', new.listing_id,
        'seller_id', new.seller_id,
        'previous_status', old.queue_status,
        'next_status', new.queue_status,
        'decision', new.decision,
        'reviewed_by', new.reviewed_by
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_listing_review_queue_audit_log on public.listing_review_queue;
create trigger on_listing_review_queue_audit_log
  after update on public.listing_review_queue
  for each row execute function public.handle_listing_review_queue_audit_log();

create or replace function public.handle_listing_admin_status_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.status is distinct from old.status then
    perform public.log_admin_audit_event(
      'listing_status_updated',
      'listing',
      new.id,
      jsonb_build_object(
        'seller_id', new.seller_id,
        'previous_status', old.status,
        'next_status', new.status
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_listing_admin_status_audit_log on public.listings;
create trigger on_listing_admin_status_audit_log
  after update of status on public.listings
  for each row execute function public.handle_listing_admin_status_audit_log();

create or replace function public.handle_seller_verification_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.status is distinct from old.status
    or new.admin_note is distinct from old.admin_note
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at then
    perform public.log_admin_audit_event(
      'seller_verification_updated',
      'seller_verification_request',
      new.id,
      jsonb_build_object(
        'seller_id', new.seller_id,
        'previous_status', old.status,
        'next_status', new.status,
        'reviewed_by', new.reviewed_by
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_seller_verification_audit_log on public.seller_verification_requests;
create trigger on_seller_verification_audit_log
  after update on public.seller_verification_requests
  for each row execute function public.handle_seller_verification_audit_log();
