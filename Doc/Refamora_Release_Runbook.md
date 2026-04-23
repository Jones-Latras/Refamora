# Refamora Release Runbook

This runbook documents the current Beta release process in the repo as of **April 23, 2026**.

## Environment Separation

Use separate Supabase projects and app env files for each profile:

- `development`: local Supabase or disposable dev project
- `staging`: internal validation environment
- `production`: public release environment

App env templates:

- [.env.example](../.env.example)
- [.env.local.example](../.env.local.example)
- [.env.staging.example](../.env.staging.example)
- [.env.production.example](../.env.production.example)

Rules:

- keep `APP_ENV` aligned with the EAS profile name
- keep `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment-specific
- never place `GROQ_*` or other Edge Function secrets in Expo app env files
- keep staging and production on hosted `https` Supabase URLs

## Required Repo Checks

Run these before any staging or production release:

```bash
npm run quality:beta
npx expo config --json
```

`npm run quality:beta` currently verifies:

- unit checks for schema validation and Supabase dev URL normalization
- Beta config checks for `verify_jwt`
- EAS profiles for `development`, `staging`, and `production`
- required admin, seller verification, and notification migrations
- release documentation and environment templates

## Supabase Deployment Order

Apply database changes before app builds that depend on them.

Recommended order:

1. Link the target Supabase project.
2. Apply pending migrations.
3. Apply only the seeds that are safe for that environment.
4. Set or update Edge Function secrets.
5. Deploy Edge Functions.
6. Regenerate `types/database.ts` if schema changed.

Example CLI flow:

```bash
npx supabase login
npx supabase link --project-ref <target-project-ref>
npx supabase db push
npx supabase functions deploy ai-health
npx supabase functions deploy ai-feedback
npx supabase functions deploy ai-listing-assist
npx supabase functions deploy ai-waste-advice
npx supabase functions deploy ai-search-assist
npx supabase functions deploy ai-listing-moderation
npx supabase functions deploy ai-photo-check
npx supabase functions deploy ai-inquiry-assist
```

## Seed Policy

Environment guidance:

- `development`: `supabase/seeds/20260416_dev_accounts.sql` is allowed
- `staging`: do not apply dev accounts; use only repair or operational SQL if needed
- `production`: do not apply dev accounts

Use [20260416_storage_repair.sql](../supabase/seeds/20260416_storage_repair.sql) only as a repair script when bucket or storage policy setup is missing or broken.

## Required Migrations For Current Beta Scope

The current Beta build depends on these later migrations in addition to the earlier base schema:

- `202604190001_contact_request_messages.sql`
- `202604190002_buyer_conversation_read_state.sql`
- `202604230002_admin_moderation_foundation.sql`
- `202604230003_seller_verification_phase1.sql`
- `202604230004_user_notifications_foundation.sql`

## Edge Function Secrets

Set AI provider secrets in the target Supabase project, not in Expo app env files.

Minimum current set:

- `GROQ_API_KEY`
- `GROQ_TEXT_ENABLED`
- `GROQ_TEXT_MODEL`
- `GROQ_TEXT_TIMEOUT_MS`
- `GROQ_VISION_ENABLED`
- `GROQ_VISION_MODEL`
- `GROQ_VISION_TIMEOUT_MS`
- `AI_RATE_LIMIT_ENABLED`
- `AI_RATE_LIMIT_WINDOW_MINUTES`
- `AI_RATE_LIMIT_MAX_REQUESTS`

Use [supabase/functions/.env.local.example](../supabase/functions/.env.local.example) as the template source.

## Internal Build Checklist

Use for advisor or internal device testing.

1. Set `APP_ENV=development` and the correct dev `SUPABASE_URL`.
2. Run `npm run quality:beta`.
3. Confirm local or dev Supabase migrations are applied.
4. Build with `development` profile.
5. Confirm sign-in, listing publish, inquiry send, reply, seller verification, and admin moderation still work.

## Staging Checklist

Use before any production candidate build.

1. Copy staging values from [.env.staging.example](../.env.staging.example) into the active app env file.
2. Link the staging Supabase project and run pending migrations.
3. Confirm staging Edge Function secrets are set.
4. Deploy updated Edge Functions.
5. Run `npm run quality:beta`.
6. Build with `staging` profile.
7. Validate core smoke flows:
   - sign-up and sign-in
   - password reset
   - create listing
   - buyer inquiry
   - seller reply
   - seller verification submit
   - admin moderation review
   - notification inbox read state

## Production Checklist

Use only after staging passes.

1. Copy production values from [.env.production.example](../.env.production.example) into the active app env file.
2. Link the production Supabase project and apply only reviewed migrations.
3. Confirm production Edge Function secrets are set.
4. Deploy Edge Functions.
5. Run `npm run quality:beta`.
6. Build with `production` profile.
7. Re-check the same staging smoke flows against production.
8. Record the app version, EAS build id, migration state, and release date in release notes.

## Current Remaining Gaps

This runbook improves repeatability, but Workstream 7 is still not fully complete because:

- staging and production deployment have not been validated end to end from this repo alone
- no automated rollback workflow exists yet
- release smoke coverage still depends on manual execution
