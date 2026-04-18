create or replace function public.prevent_duplicate_active_listings()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'active' and exists (
    select 1
    from public.listings
    where seller_id = new.seller_id
      and status = 'active'
      and lower(btrim(title)) = lower(btrim(new.title))
      and waste_type = new.waste_type
      and quantity = new.quantity
      and unit = new.unit
      and price = new.price
      and lower(btrim(coalesce(city, ''))) = lower(btrim(coalesce(new.city, '')))
      and lower(btrim(coalesce(address, ''))) = lower(btrim(coalesce(new.address, '')))
      and fulfillment_type = new.fulfillment_type
      and accept_offers = new.accept_offers
  ) then
    raise exception 'duplicate_active_listing'
      using errcode = '23505',
        message = 'You already have an active listing with the same details. Edit the existing listing instead of publishing it again.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_duplicate_active_listings_trigger on public.listings;
create trigger prevent_duplicate_active_listings_trigger
  before insert on public.listings
  for each row
  execute function public.prevent_duplicate_active_listings();
