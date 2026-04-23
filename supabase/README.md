# Supabase Setup

This folder is the source-controlled Phase 1 database setup for AgriWaste.
For current Beta release and environment workflow, also see [../Doc/Refamora_Release_Runbook.md](../Doc/Refamora_Release_Runbook.md).

## Apply the schema

Option 1: Supabase SQL Editor

1. Open the Supabase project dashboard.
2. Open the SQL Editor.
3. Run [migrations/20260416_initial_schema.sql](./migrations/20260416_initial_schema.sql).

Option 2: Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Apply later migrations in repo order, including:

- [migrations/202604170001_ai_events.sql](./migrations/202604170001_ai_events.sql)
- [migrations/202604170002_ai_events_waste_value_advisor.sql](./migrations/202604170002_ai_events_waste_value_advisor.sql)
- [migrations/202604170003_ai_events_buyer_search_assistant.sql](./migrations/202604170003_ai_events_buyer_search_assistant.sql)
- [migrations/202604170004_ai_events_listing_moderation.sql](./migrations/202604170004_ai_events_listing_moderation.sql)
- [migrations/202604170005_ai_events_photo_quality_checker.sql](./migrations/202604170005_ai_events_photo_quality_checker.sql)
- [migrations/202604170006_listing_review_queue.sql](./migrations/202604170006_listing_review_queue.sql)
- [migrations/202604170007_ai_events_messaging_support.sql](./migrations/202604170007_ai_events_messaging_support.sql)
- [migrations/202604170008_contact_requests_responded.sql](./migrations/202604170008_contact_requests_responded.sql)
- [migrations/202604190001_contact_request_messages.sql](./migrations/202604190001_contact_request_messages.sql)
- [migrations/202604190002_buyer_conversation_read_state.sql](./migrations/202604190002_buyer_conversation_read_state.sql)
- [migrations/202604230002_admin_moderation_foundation.sql](./migrations/202604230002_admin_moderation_foundation.sql)
- [migrations/202604230003_seller_verification_phase1.sql](./migrations/202604230003_seller_verification_phase1.sql)
- [migrations/202604230004_user_notifications_foundation.sql](./migrations/202604230004_user_notifications_foundation.sql)
- [migrations/202604230005_admin_audit_log.sql](./migrations/202604230005_admin_audit_log.sql)

## Regenerate TypeScript types

After the schema is applied, regenerate `types/database.ts`:

```bash
npx supabase gen types typescript --project-id <your-project-ref> > types/database.ts
```

## Checklist impact

This repo now contains the SQL for:

- users, listings, contact_requests, and waste_suggestions tables
- indexes
- storage buckets and storage policies
- row level security policies
- waste suggestion seed data

Those Phase 1 checklist items should remain partial until the SQL is applied to the real Supabase project and verified.

## Seed guidance

- `seeds/20260416_dev_accounts.sql` is for development only and should not be applied to staging or production.
- `seeds/20260416_storage_repair.sql` is a repair script, not a default production seed step.

## AI functions

The repo now also contains a first AI edge function scaffold:

- `functions/ai-listing-assist`
- `functions/ai-health`
- `functions/ai-feedback`
- `functions/ai-waste-advice`
- `functions/ai-search-assist`
- `functions/ai-listing-moderation`
- `functions/ai-photo-check`
- `functions/ai-inquiry-assist`
- shared provider layer in `functions/_shared`
- `groqTextProvider` for text features
- `groqVisionProvider` for photo analysis and image-based moderation

The AI event migration adds `public.ai_events`, which stores provider, latency, success/error state, and user feedback for the listing copilot.

### Suggested function secrets

Set these in Supabase before deploying AI functions:

- `GROQ_API_KEY=<your-groq-key>`
- `GROQ_TEXT_ENABLED=true`
- `GROQ_TEXT_MODEL=qwen/qwen3-32b`
- `GROQ_TEXT_TIMEOUT_MS=20000`
- `GROQ_VISION_ENABLED=true`
- `GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct`
- `GROQ_VISION_TIMEOUT_MS=20000`
- `AI_RATE_LIMIT_ENABLED=true`
- `AI_RATE_LIMIT_WINDOW_MINUTES=10`
- `AI_RATE_LIMIT_MAX_REQUESTS=8`

For local Edge Function development, use [functions/.env.local.example](./functions/.env.local.example) as the template for AI provider secrets.

The current rate limiter uses `ai_events` as the request log and enforces a per-user rolling window on the listing copilot endpoint.

On the app side, the farmer dashboard reads `ai_events` through RLS to show request volume, average latency, helpfulness rate, and provider mix for recent listing copilot usage.
The listing editor also uses the AI layer for a Waste-To-Value Advisor beside waste type selection, returning short uses, cautions, and a market tip for the selected material.
The waste advisor is now grounded with a small curated Refamora knowledge base so the response can surface a visible `Grounded in` basis instead of being prompt-only.
The buyer feed also includes a Search with AI flow that interprets natural-language search into structured filters, shows the interpretation back to the user, and only applies it after confirmation.
The listing editor also runs an automatic AI safety check before publish, reviewing listing text and image content and stopping the submit flow when the result needs review or is blocked.
The listing editor now also includes an on-demand Photo Check that reviews image clarity, suggests retakes, and can surface a likely waste type when the image is clear enough.
Flagged moderation results are now persisted to `listing_review_queue`, giving Refamora a basic admin review queue foundation before a dedicated admin dashboard exists.
The farmer inquiry flow now includes visible AI actions: a `Summarize inquiries` button on the seller inbox screen and a `Draft reply` button on each buyer inquiry card.
The inquiry flow also now supports a user-visible `responded` state so sellers can mark an inquiry as handled and buyers can see that status in their sent requests.
