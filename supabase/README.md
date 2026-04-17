# Supabase Setup

This folder is the source-controlled Phase 1 database setup for AgriWaste.

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

After the base schema is in place, also apply [migrations/20260417_ai_events.sql](./migrations/20260417_ai_events.sql) to enable AI event logging and feedback capture.
Then apply [migrations/20260417_ai_events_waste_value_advisor.sql](./migrations/20260417_ai_events_waste_value_advisor.sql) to allow waste advisor events in the same analytics table.
Then apply [migrations/20260417_ai_events_buyer_search_assistant.sql](./migrations/20260417_ai_events_buyer_search_assistant.sql) to allow buyer search assistant events in the same analytics table.
Then apply [migrations/20260417_ai_events_listing_moderation.sql](./migrations/20260417_ai_events_listing_moderation.sql) to allow listing moderation events in the same analytics table.
Then apply [migrations/20260417_ai_events_photo_quality_checker.sql](./migrations/20260417_ai_events_photo_quality_checker.sql) to allow photo checker events in the same analytics table.
Then apply [migrations/20260417_listing_review_queue.sql](./migrations/20260417_listing_review_queue.sql) to create the moderation review queue table for flagged listings.

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

## AI functions

The repo now also contains a first AI edge function scaffold:

- `functions/ai-listing-assist`
- `functions/ai-health`
- `functions/ai-feedback`
- `functions/ai-waste-advice`
- `functions/ai-search-assist`
- `functions/ai-listing-moderation`
- `functions/ai-photo-check`
- shared provider layer in `functions/_shared`
- `localGemmaProvider` as the primary provider
- `geminiProvider` as the optional fallback

The AI event migration adds `public.ai_events`, which stores provider, latency, success/error state, and user feedback for the listing copilot.

### Suggested function secrets

Set these in Supabase before deploying AI functions:

- `LOCAL_GEMMA_ENABLED=true`
- `LOCAL_GEMMA_BASE_URL=http://host.docker.internal:11434`
- `LOCAL_GEMMA_MODEL=gemma`
- `LOCAL_GEMMA_TIMEOUT_MS=20000`
- `GEMINI_ENABLED=false`
- `GEMINI_API_KEY=<your-key-if-used>`
- `GEMINI_MODEL=gemini-2.5-flash`
- `GEMINI_TIMEOUT_MS=20000`
- `AI_RATE_LIMIT_ENABLED=true`
- `AI_RATE_LIMIT_WINDOW_MINUTES=10`
- `AI_RATE_LIMIT_MAX_REQUESTS=8`

If you deploy functions remotely, note that `LOCAL_GEMMA_BASE_URL` must point to a reachable host from the function runtime. For live hackathon demos on one machine, local or self-hosted execution is the safer path.

The current rate limiter uses `ai_events` as the request log and enforces a per-user rolling window on the listing copilot endpoint.

On the app side, the farmer dashboard reads `ai_events` through RLS to show request volume, average latency, helpfulness rate, and provider mix for recent listing copilot usage.
The listing editor also uses the AI layer for a Waste-To-Value Advisor beside waste type selection, returning short uses, cautions, and a market tip for the selected material.
The waste advisor is now grounded with a small curated Refamora knowledge base so the response can surface a visible `Grounded in` basis instead of being prompt-only.
The buyer feed also includes a Search with AI flow that interprets natural-language search into structured filters, shows the interpretation back to the user, and only applies it after confirmation.
The listing editor also runs an automatic AI safety check before publish, reviewing listing text and image content and stopping the submit flow when the result needs review or is blocked.
The listing editor now also includes an on-demand Photo Check that reviews image clarity, suggests retakes, and can surface a likely waste type when the image is clear enough.
Flagged moderation results are now persisted to `listing_review_queue`, giving Refamora a basic admin review queue foundation before a dedicated admin dashboard exists.
