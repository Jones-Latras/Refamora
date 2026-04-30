-- Proposal demo dataset for the admin hub.
--
-- Prerequisites:
-- 1. Apply all migrations through 202604240001_app_crash_reports.sql.
-- 2. Create or seed these demo accounts first:
--    - buyer@agriwaste.test
--    - farmer@agriwaste.test
--    - admin@agriwaste.test
-- 3. Promote the admin account to role = 'admin'.
--
-- You can change the email addresses below if your demo accounts use different emails.
--
create extension if not exists pgcrypto;

do $$
declare
  admin_email text := 'admin@agriwaste.test';
  seller_email text := 'farmer@agriwaste.test';
  buyer_email text := 'buyer@agriwaste.test';

  v_admin_id uuid;
  v_seller_id uuid;
  v_buyer_id uuid;

  listing_compost_id uuid := '31000000-0000-0000-0000-000000000001';
  listing_straw_id uuid := '31000000-0000-0000-0000-000000000002';
  listing_silage_id uuid := '31000000-0000-0000-0000-000000000003';

  contact_request_id uuid := '32000000-0000-0000-0000-000000000001';
  seller_reply_message_id uuid := '32000000-0000-0000-0000-000000000002';

  engagement_view_one_id uuid := '33000000-0000-0000-0000-000000000001';
  engagement_view_two_id uuid := '33000000-0000-0000-0000-000000000002';
  engagement_view_three_id uuid := '33000000-0000-0000-0000-000000000003';

  pending_report_id uuid := '34000000-0000-0000-0000-000000000001';
  reviewed_report_id uuid := '34000000-0000-0000-0000-000000000002';

  pending_queue_id uuid := '35000000-0000-0000-0000-000000000001';
  resolved_queue_id uuid := '35000000-0000-0000-0000-000000000002';

  pending_verification_id uuid := '36000000-0000-0000-0000-000000000001';
  rejected_verification_id uuid := '36000000-0000-0000-0000-000000000002';

  crash_fatal_id uuid := '37000000-0000-0000-0000-000000000001';
  crash_error_id uuid := '37000000-0000-0000-0000-000000000002';

  audit_listing_id uuid := '38000000-0000-0000-0000-000000000001';
  audit_report_id uuid := '38000000-0000-0000-0000-000000000002';
  audit_queue_id uuid := '38000000-0000-0000-0000-000000000003';
  audit_verification_id uuid := '38000000-0000-0000-0000-000000000004';
begin
  select id into v_admin_id
  from public.users
  where email = admin_email
  limit 1;

  select id into v_seller_id
  from public.users
  where email = seller_email
  limit 1;

  select id into v_buyer_id
  from public.users
  where email = buyer_email
  limit 1;

  if v_admin_id is null then
    raise exception 'Admin demo account not found for email: %', admin_email;
  end if;

  if v_seller_id is null then
    raise exception 'Seller demo account not found for email: %', seller_email;
  end if;

  if v_buyer_id is null then
    raise exception 'Buyer demo account not found for email: %', buyer_email;
  end if;

  update public.users
  set role = 'admin'
  where id = v_admin_id;

  update public.users
  set role = 'farmer',
      is_verified = false
  where id = v_seller_id;

  update public.users
  set role = 'buyer'
  where id = v_buyer_id;

  delete from public.user_notifications
  where entity_id in (
    contact_request_id,
    pending_verification_id,
    rejected_verification_id
  );

  delete from public.user_notifications
  where entity_type = 'seller_verification_request'
    and user_id = v_seller_id;

  delete from public.admin_action_logs
  where id in (
    audit_listing_id,
    audit_report_id,
    audit_queue_id,
    audit_verification_id
  );

  delete from public.app_crash_reports
  where id in (crash_fatal_id, crash_error_id);

  delete from public.listing_reports
  where id in (pending_report_id, reviewed_report_id);

  delete from public.listing_review_queue
  where id in (pending_queue_id, resolved_queue_id);

  delete from public.seller_verification_requests
  where id in (pending_verification_id, rejected_verification_id)
     or seller_id = v_seller_id;

  delete from public.contact_requests
  where id = contact_request_id;

  delete from public.listing_engagement_events
  where id in (
    engagement_view_one_id,
    engagement_view_two_id,
    engagement_view_three_id
  );

  delete from public.listings
  where id in (
    listing_compost_id,
    listing_straw_id,
    listing_silage_id
  );

  insert into public.listings (
    id,
    seller_id,
    title,
    waste_type,
    description,
    quantity,
    unit,
    price,
    accept_offers,
    image_url,
    address,
    city,
    latitude,
    longitude,
    fulfillment_type,
    status,
    created_at
  )
  values
    (
      listing_compost_id,
      v_seller_id,
      'Dried Coconut Husk for Organic Mulch',
      'coconut_husk',
      'Clean, sun-dried coconut husk suitable for mulch, compost mixes, and coco coir processing.',
      180,
      'kg',
      12,
      true,
      null,
      'Sitio Kisolon, Malaybalay',
      'Malaybalay',
      8.1570,
      125.1278,
      'pickup',
      'active',
      now() - interval '6 days'
    ),
    (
      listing_straw_id,
      v_seller_id,
      'Rice Straw Bales for Mushroom Growers',
      'rice_straw',
      'Bundled rice straw from the latest harvest. Listing was held for manual admin review because the posting details need confirmation.',
      95,
      'bundle',
      35,
      false,
      null,
      'Barangay Sumpong, Malaybalay',
      'Malaybalay',
      8.1502,
      125.1305,
      'pickup',
      'unavailable',
      now() - interval '4 days'
    ),
    (
      listing_silage_id,
      v_seller_id,
      'Corn Stalk Bundles for Silage Feed',
      'corn_stalks',
      'Freshly cut corn stalk bundles for livestock feed trials and small-scale biomass use.',
      75,
      'bundle',
      28,
      true,
      null,
      'Imbayao, Malaybalay',
      'Malaybalay',
      8.1801,
      125.1031,
      'delivery',
      'active',
      now() - interval '2 days'
    );

  insert into public.contact_requests (
    id,
    listing_id,
    buyer_id,
    seller_id,
    message,
    status,
    created_at,
    updated_at
  )
  values (
    contact_request_id,
    listing_compost_id,
    v_buyer_id,
    v_seller_id,
    'Hello, is this still available? We want to use it for compost trials this week.',
    'pending',
    now() - interval '8 hours',
    now() - interval '8 hours'
  );

  insert into public.contact_request_messages (
    id,
    request_id,
    sender_id,
    message,
    created_at
  )
  values (
    seller_reply_message_id,
    contact_request_id,
    v_seller_id,
    'Yes, it is available. We can prepare 180 kg for pickup tomorrow morning.',
    now() - interval '7 hours'
  );

  insert into public.listing_engagement_events (
    id,
    listing_id,
    buyer_id,
    event_type,
    created_at
  )
  values
    (
      engagement_view_one_id,
      listing_compost_id,
      v_buyer_id,
      'view',
      now() - interval '9 hours'
    ),
    (
      engagement_view_two_id,
      listing_compost_id,
      v_buyer_id,
      'view',
      now() - interval '8 hours 30 minutes'
    ),
    (
      engagement_view_three_id,
      listing_silage_id,
      v_buyer_id,
      'view',
      now() - interval '1 day'
    );

  insert into public.listing_reports (
    id,
    listing_id,
    reporter_id,
    seller_id,
    reason,
    details,
    status
  )
  values
    (
      pending_report_id,
      listing_silage_id,
      v_buyer_id,
      v_seller_id,
      'inaccurate_details',
      'The quantity in the listing seems inconsistent with the photo and bundle count shown in chat.',
      'pending'
    ),
    (
      reviewed_report_id,
      listing_compost_id,
      v_buyer_id,
      v_seller_id,
      'wrong_photo',
      'The old image did not clearly match the actual dried husk condition.',
      'reviewed'
    );

  update public.listing_reports
  set
    admin_note = 'Seller updated the listing image after review.',
    reviewed_by = v_admin_id,
    reviewed_at = now() - interval '2 days'
  where id = reviewed_report_id;

  insert into public.listing_review_queue (
    id,
    seller_id,
    listing_id,
    ai_event_id,
    decision,
    queue_status,
    title,
    waste_type,
    city,
    reasons,
    field_warnings,
    image_warnings,
    listing_snapshot,
    created_at,
    updated_at
  )
  values
    (
      pending_queue_id,
      v_seller_id,
      listing_straw_id,
      null,
      'block',
      'pending',
      'Rice Straw Bales for Mushroom Growers',
      'rice_straw',
      'Malaybalay',
      '["Possible mismatch between listing claim and reviewed media."]'::jsonb,
      '["Clarify whether the listing is reserved or open for new buyers."]'::jsonb,
      '["Photo quality is low and does not clearly show the bale count."]'::jsonb,
      jsonb_build_object(
        'title', 'Rice Straw Bales for Mushroom Growers',
        'status', 'unavailable'
      ),
      now() - interval '1 day',
      now() - interval '1 day'
    ),
    (
      resolved_queue_id,
      v_seller_id,
      listing_compost_id,
      null,
      'review',
      'resolved',
      'Dried Coconut Husk for Organic Mulch',
      'coconut_husk',
      'Malaybalay',
      '["Listing copied from an older draft and needed manual cleanup."]'::jsonb,
      '["Clarify price per kilogram versus total lot pricing."]'::jsonb,
      '[]'::jsonb,
      jsonb_build_object(
        'title', 'Dried Coconut Husk for Organic Mulch',
        'status', 'active'
      ),
      now() - interval '3 days',
      now() - interval '3 days'
    );

  update public.listing_review_queue
  set
    admin_note = 'Seller corrected the pricing format and clarified the listing description.',
    reviewed_by = v_admin_id,
    reviewed_at = now() - interval '2 days',
    updated_at = now() - interval '2 days'
  where id = resolved_queue_id;

  insert into public.app_crash_reports (
    id,
    user_id,
    source,
    severity,
    message,
    stack,
    component_stack,
    route,
    app_env,
    app_version,
    platform,
    metadata,
    created_at
  )
  values
    (
      crash_fatal_id,
      v_seller_id,
      'react_error_boundary',
      'fatal',
      'Cannot render seller dashboard metric card',
      'TypeError: undefined is not an object (evaluating ''performance.viewCount'')',
      'in SellerDashboardMetricCard',
      '/(farmer)/dashboard',
      'staging',
      '1.0.0-beta.1',
      'android',
      jsonb_build_object(
        'demo', true,
        'feature', 'seller_dashboard'
      ),
      now() - interval '6 hours'
    ),
    (
      crash_error_id,
      v_buyer_id,
      'global_js_handler',
      'error',
      'Network request failed while refreshing listing detail',
      'Error: Network request failed',
      null,
      '/(shared)/listing/' || listing_silage_id::text,
      'staging',
      '1.0.0-beta.1',
      'android',
      jsonb_build_object(
        'demo', true,
        'feature', 'listing_detail_refresh'
      ),
      now() - interval '2 hours'
    );

  insert into public.admin_action_logs (
    id,
    admin_id,
    action_type,
    entity_type,
    entity_id,
    metadata,
    created_at
  )
  values
    (
      audit_listing_id,
      v_admin_id,
      'listing_status_updated',
      'listing',
      listing_straw_id,
      jsonb_build_object(
        'seller_id', v_seller_id,
        'previous_status', 'active',
        'next_status', 'unavailable'
      ),
      now() - interval '1 day'
    ),
    (
      audit_report_id,
      v_admin_id,
      'listing_report_updated',
      'listing_report',
      reviewed_report_id,
      jsonb_build_object(
        'listing_id', listing_compost_id,
        'seller_id', v_seller_id,
        'previous_status', 'pending',
        'next_status', 'reviewed',
        'reviewed_by', v_admin_id
      ),
      now() - interval '2 days'
    ),
    (
      audit_queue_id,
      v_admin_id,
      'review_queue_updated',
      'listing_review_queue',
      resolved_queue_id,
      jsonb_build_object(
        'listing_id', listing_compost_id,
        'seller_id', v_seller_id,
        'previous_status', 'pending',
        'next_status', 'resolved',
        'decision', 'review',
        'reviewed_by', v_admin_id
      ),
      now() - interval '2 days'
    );
end $$;
