alter table public.ai_events
  drop constraint if exists ai_events_feature_check;

alter table public.ai_events
  add constraint ai_events_feature_check
  check (
    feature in (
      'listing_copilot',
      'waste_value_advisor',
      'buyer_search_assistant',
      'listing_moderation',
      'photo_quality_checker'
    )
  );
