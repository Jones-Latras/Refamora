alter table public.contact_requests
  add column if not exists buyer_last_read_at timestamptz;

update public.contact_requests
set buyer_last_read_at = coalesce(buyer_last_read_at, updated_at, created_at)
where buyer_last_read_at is null;

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
    updated_at = new.created_at,
    buyer_last_read_at = case
      when buyer_id = new.sender_id then new.created_at
      else buyer_last_read_at
    end
  where id = new.request_id;

  return new;
end;
$$;

create or replace function public.mark_buyer_conversation_read(p_request_id uuid)
returns public.contact_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.contact_requests;
begin
  update public.contact_requests
  set buyer_last_read_at = now()
  where id = p_request_id
    and buyer_id = auth.uid()
    and (
      buyer_last_read_at is null
      or buyer_last_read_at < updated_at
    )
  returning * into updated_row;

  if updated_row.id is null then
    select *
    into updated_row
    from public.contact_requests
    where id = p_request_id
      and buyer_id = auth.uid();
  end if;

  return updated_row;
end;
$$;

grant execute on function public.mark_buyer_conversation_read(uuid) to authenticated;
