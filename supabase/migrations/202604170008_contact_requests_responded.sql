alter table public.contact_requests
  drop constraint if exists contact_requests_status_check;

alter table public.contact_requests
  add constraint contact_requests_status_check
  check (status in ('pending', 'seen', 'responded'));
