# Refamora Local Supabase + Gemma 3 Setup

This setup gives you the cleanest development and demo path for local AI:

`Expo app on Android -> local Supabase -> local Edge Functions -> local Gemma 3`

That avoids the main problem with remote Supabase: remote Edge Functions cannot
normally reach `http://127.0.0.1:11434` on your laptop.

## Goal

Use:

- local Supabase for auth, database, storage, and Edge Functions
- local Gemma 3 as the primary AI provider
- Expo Go on Android as the client

## 1. App environment

The Expo app reads its Supabase config from:

- [app.config.ts](/abs/path/c:/Users/USER/Documents/Portfolio%20Projects/agriwaste/app.config.ts:1)
- [services/supabase.ts](/abs/path/c:/Users/USER/Documents/Portfolio%20Projects/agriwaste/services/supabase.ts:1)

Use [`.env.local.example`](/abs/path/c:/Users/USER/Documents/Portfolio%20Projects/agriwaste/.env.local.example:1) as the local app template.

Your local app env should look like:

```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your-local-anon-key
EXPO_PUBLIC_AI_LISTING_ASSIST_ENABLED=true
```

Important:

- `SUPABASE_URL` must point to the **local** Supabase API, not your hosted project
- `SUPABASE_ANON_KEY` must be the **local** anon key from the local Supabase stack

## 2. Function environment

The AI provider config is read inside the function runtime from:

- [supabase/functions/_shared/providers/localGemmaProvider.ts](/abs/path/c:/Users/USER/Documents/Portfolio%20Projects/agriwaste/supabase/functions/_shared/providers/localGemmaProvider.ts:1)
- [supabase/functions/_shared/providers/geminiProvider.ts](/abs/path/c:/Users/USER/Documents/Portfolio%20Projects/agriwaste/supabase/functions/_shared/providers/geminiProvider.ts:1)

Use [supabase/functions/.env.local.example](/abs/path/c:/Users/USER/Documents/Portfolio%20Projects/agriwaste/supabase/functions/.env.local.example:1) as the template for local AI function secrets.

Your local function env should look like:

```env
LOCAL_GEMMA_ENABLED=true
LOCAL_GEMMA_BASE_URL=http://127.0.0.1:11434
LOCAL_GEMMA_MODEL=gemma3
LOCAL_GEMMA_TIMEOUT_MS=20000

GEMINI_ENABLED=false
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT_MS=20000

AI_RATE_LIMIT_ENABLED=true
AI_RATE_LIMIT_WINDOW_MINUTES=10
AI_RATE_LIMIT_MAX_REQUESTS=8
```

Important:

- `LOCAL_GEMMA_MODEL` must match the exact local model tag your Gemma server exposes
- if your model is really `gemma3:4b` or `gemma3:12b`, use that exact name instead of plain `gemma3`

## 3. Start the local Supabase stack

Use the Supabase CLI to start the local stack.

Typical local workflow:

```bash
npx supabase start
```

After the stack starts, collect the local values it prints, especially:

- local API URL
- local anon key

Put those into your app env.

## 4. Apply the schema locally

For a local dev stack, the safest path is to apply the migrations to the local database before testing the app.

Typical workflow:

```bash
npx supabase db reset
```

That should apply the migrations in `supabase/migrations` to the local database.

If you want seeded test users, also apply the seed scripts you already use for manual testing after the reset.

## 5. Serve the Edge Functions locally

The app AI layer already calls these functions through Supabase:

- `ai-listing-assist`
- `ai-health`
- `ai-feedback`
- `ai-waste-advice`
- `ai-search-assist`
- `ai-listing-moderation`
- `ai-photo-check`
- `ai-inquiry-assist`

Serve the functions locally and make sure the local function runtime loads your local function env file.

Typical local workflow:

```bash
npx supabase functions serve --env-file supabase/functions/.env.local
```

If your CLI version uses a slightly different local functions workflow, keep the same principle:

- functions must run locally
- functions must load `LOCAL_GEMMA_*`
- functions must be able to reach `http://127.0.0.1:11434`

## 6. Confirm Gemma 3 is reachable

Before testing the UI, make sure your local Gemma server is already running and accepting HTTP requests on the URL you configured.

For this repo, the default expected local URL is:

```text
http://127.0.0.1:11434
```

If your local Gemma server is on a different host or port, change `LOCAL_GEMMA_BASE_URL` in the function env.

## 7. Start Expo

Once the local Supabase stack and local functions are running, start the app:

```bash
npx expo start
```

Open the app in Expo Go on Android.

## 8. Android network requirement

Expo Go on Android can still use the local AI path as long as:

- your phone can reach the local Supabase API running on your laptop
- your laptop keeps the local Supabase stack and function server running

In practice, the phone and laptop should be on the same Wi-Fi network for the smoothest local demo.

## 9. First verification order

Test in this order:

1. `ai-health`
2. `Improve with AI` in create listing
3. `Search with AI` in buyer feed
4. photo check
5. inquiry summary / reply draft

This keeps debugging narrow.

## 10. What should stay local vs app-side

Expo app env:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_AI_LISTING_ASSIST_ENABLED`

Function runtime env:

- `LOCAL_GEMMA_*`
- `GEMINI_*`
- `AI_RATE_LIMIT_*`

Do not rely on `LOCAL_GEMMA_*` inside the Expo `.env` alone. Those values matter only when the **function runtime** reads them.

## 11. Current repo implication

If your current `.env` still points to:

```text
https://ieqenmwpbalqbdctqnqd.supabase.co
```

then the app is still using the hosted Supabase project, not the local stack.

For local Gemma 3 to actually power the AI features, switch the app env to the local Supabase URL and local anon key before testing.

## 12. Recommended local demo checklist

- local Gemma 3 server is running
- local Supabase stack is running
- local functions are running
- app `.env` points to local Supabase
- function env points to local Gemma 3
- AI event migrations are applied locally
- `EXPO_PUBLIC_AI_LISTING_ASSIST_ENABLED=true`

When all of those are true, the AI features should work in Expo Go on Android through the local stack.
