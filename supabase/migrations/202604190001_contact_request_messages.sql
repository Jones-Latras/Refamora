alter table public.contact_requests
  add column if not exists updated_at timestamptz;

update public.contact_requests
set updated_at = coalesce(updated_at, created_at, now());

alter table public.contact_requests
  alter column updated_at set default now();

alter table public.contact_requests
  alter column updated_at set not null;

create table if not exists public.contact_request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.contact_requests(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  constraint contact_request_messages_message_check
    check (char_length(btrim(message)) > 0)
);

create index if not exists contact_request_messages_request_id_idx
  on public.contact_request_messages (request_id);

create index if not exists contact_request_messages_request_id_created_at_idx
  on public.contact_request_messages (request_id, created_at desc);

alter table public.contact_request_messages enable row level security;

drop policy if exists "Buyers and sellers can read related contact request messages" on public.contact_request_messages;
create policy "Buyers and sellers can read related contact request messages"
  on public.contact_request_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.contact_requests
      where contact_requests.id = contact_request_messages.request_id
        and (
          contact_requests.buyer_id = auth.uid()
          or contact_requests.seller_id = auth.uid()
        )
    )
  );

drop policy if exists "Buyers and sellers can insert related contact request messages" on public.contact_request_messages;
create policy "Buyers and sellers can insert related contact request messages"
  on public.contact_request_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.contact_requests
      where contact_requests.id = contact_request_messages.request_id
        and (
          contact_requests.buyer_id = auth.uid()
          or contact_requests.seller_id = auth.uid()
        )
    )
  );

create or replace function public.handle_contact_request_inserted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(btrim(coalesce(new.message, '')), '') is not null then
    insert into public.contact_request_messages (
      request_id,
      sender_id,
      message,
      created_at
    )
    values (
      new.id,
      new.buyer_id,
      btrim(new.message),
      coalesce(new.created_at, now())
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_contact_request_inserted on public.contact_requests;
create trigger on_contact_request_inserted
  after insert on public.contact_requests
  for each row execute function public.handle_contact_request_inserted();

create or replace function public.handle_contact_request_message_inserted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.contact_requests
  set
    status = case
      when buyer_id = new.sender_id then 'pending'
      else 'responded'
    end,
    updated_at = new.created_at
  where id = new.request_id;

  return new;
end;
$$;

drop trigger if exists on_contact_request_message_inserted on public.contact_request_messages;
create trigger on_contact_request_message_inserted
  after insert on public.contact_request_messages
  for each row execute function public.handle_contact_request_message_inserted();

insert into public.contact_request_messages (
  request_id,
  sender_id,
  message,
  created_at
)
select
  contact_requests.id,
  contact_requests.buyer_id,
  btrim(contact_requests.message),
  contact_requests.created_at
from public.contact_requests
where nullif(btrim(coalesce(contact_requests.message, '')), '') is not null
  and not exists (
    select 1
    from public.contact_request_messages
    where contact_request_messages.request_id = contact_requests.id
      and contact_request_messages.sender_id = contact_requests.buyer_id
      and contact_request_messages.created_at = contact_requests.created_at
      and contact_request_messages.message = btrim(contact_requests.message)
  );

update public.contact_requests
set updated_at = greatest(
  coalesce(updated_at, created_at),
  coalesce(
    (
      select max(contact_request_messages.created_at)
      from public.contact_request_messages
      where contact_request_messages.request_id = contact_requests.id
    ),
    created_at
  )
);
