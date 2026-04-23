alter table public.ai_events
  drop constraint if exists ai_events_provider_check;

alter table public.ai_events
  add constraint ai_events_provider_check
  check (provider in ('groq_text', 'groq_vision'));
