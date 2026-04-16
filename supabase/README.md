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
