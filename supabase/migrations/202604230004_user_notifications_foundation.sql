create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null
    check (kind in (
      'inquiry_received',
      'reply_received',
      'verification_approved',
      'verification_rejected'
    )),
  title text not null,
  body text not null,
  entity_type text
    check (entity_type in ('contact_request', 'seller_verification_request')),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_id_created_at_idx
  on public.user_notifications (user_id, created_at desc);

create index if not exists user_notifications_user_id_is_read_idx
  on public.user_notifications (user_id, is_read, created_at desc);

alter table public.user_notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.user_notifications;
create policy "Users can read own notifications"
  on public.user_notifications
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.create_user_notification(
  p_user_id uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
begin
  insert into public.user_notifications (
    user_id,
    kind,
    title,
    body,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_user_id,
    p_kind,
    p_title,
    p_body,
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

create or replace function public.mark_user_notifications_read(
  p_notification_ids uuid[] default null
)
returns setof public.user_notifications
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.user_notifications
  set
    is_read = true,
    read_at = coalesce(read_at, now())
  where user_id = auth.uid()
    and is_read = false
    and (
      p_notification_ids is null
      or id = any(p_notification_ids)
    )
  returning *;
end;
$$;

grant execute on function public.mark_user_notifications_read(uuid[]) to authenticated;

create or replace function public.handle_contact_request_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.contact_requests%rowtype;
  v_listing_title text;
  v_recipient_id uuid;
  v_kind text;
  v_title text;
  v_body text;
begin
  select *
  into v_request
  from public.contact_requests
  where id = new.request_id;

  if not found then
    return new;
  end if;

  select title
  into v_listing_title
  from public.listings
  where id = v_request.listing_id;

  v_listing_title := coalesce(nullif(btrim(v_listing_title), ''), 'this listing');

  if new.sender_id = v_request.buyer_id then
    v_recipient_id := v_request.seller_id;
    v_kind := 'inquiry_received';
    v_title := 'New inquiry received';
    v_body := format('A buyer sent a message about %s.', v_listing_title);
  else
    v_recipient_id := v_request.buyer_id;
    v_kind := 'reply_received';
    v_title := 'Seller replied';
    v_body := format('You received a new reply about %s.', v_listing_title);
  end if;

  perform public.create_user_notification(
    v_recipient_id,
    v_kind,
    v_title,
    v_body,
    'contact_request',
    new.request_id,
    jsonb_build_object(
      'request_id', new.request_id,
      'sender_id', new.sender_id
    )
  );

  return new;
end;
$$;

drop trigger if exists on_contact_request_message_notification on public.contact_request_messages;
create trigger on_contact_request_message_notification
  after insert on public.contact_request_messages
  for each row execute function public.handle_contact_request_message_notification();

create or replace function public.handle_seller_verification_status_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' or new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'approved' then
    perform public.create_user_notification(
      new.seller_id,
      'verification_approved',
      'Seller verification approved',
      'Your seller verification was approved. Buyers can now see your verified badge.',
      'seller_verification_request',
      new.id,
      jsonb_build_object('status', new.status)
    );
  elsif new.status = 'rejected' then
    perform public.create_user_notification(
      new.seller_id,
      'verification_rejected',
      'Seller verification needs changes',
      'Your seller verification was reviewed and needs updated documents or details.',
      'seller_verification_request',
      new.id,
      jsonb_build_object('status', new.status)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_seller_verification_status_notification on public.seller_verification_requests;
create trigger on_seller_verification_status_notification
  after update of status on public.seller_verification_requests
  for each row execute function public.handle_seller_verification_status_notification();
