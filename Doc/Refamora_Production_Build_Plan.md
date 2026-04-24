# Refamora Production Build Plan

This document defines the current production build path for Refamora as of **April 24, 2026**.

It sits between the broader [Refamora_Production_Roadmap.md](./Refamora_Production_Roadmap.md) and the procedural [Refamora_Release_Runbook.md](./Refamora_Release_Runbook.md). The goal is to make each release candidate traceable, repeatable, and reviewable.

## Scope

This plan covers:

- internal `development` builds
- `staging` release-candidate builds
- `production` store-ready builds
- the minimum release record that should exist for every build candidate

This plan does not claim that production rollout is fully automated. Workstream 7 remains partial until the real staging and production environments are validated end to end.

## Build Profiles

The repo currently supports these EAS profiles:

- `development`: internal development client build
- `staging`: internal release-candidate build for validation
- `production`: store-ready production build

Source of truth:

- [eas.json](../eas.json)
- [app.config.ts](../app.config.ts)

## Release Inputs

Before starting any staging or production build, confirm:

- app env file is aligned to the target profile
- Supabase target project is correct for that profile
- required migrations are already applied in that target project
- Edge Function secrets are set for that target project
- pending app changes are committed or otherwise traceable
- `npm run quality:beta` passes locally

Required supporting docs:

- [Refamora_Release_Runbook.md](./Refamora_Release_Runbook.md)
- [Refamora_Rollback_Runbook.md](./Refamora_Rollback_Runbook.md)

## Preflight Checklist

Run this before `staging` or `production`:

```bash
npm install
npm run quality:beta
npx expo config --json
```

Then verify manually:

1. `APP_ENV` matches the intended EAS profile.
2. `SUPABASE_URL` points to the correct environment.
3. staging and production use hosted `https` Supabase URLs.
4. required migrations listed in the release runbook are already present in the target environment.
5. the target environment has the required AI Edge Function secrets.

## Build Commands

### Development Build

Use when testing against local or disposable dev infrastructure.

```bash
eas build --platform android --profile development
```

Optional iOS build:

```bash
eas build --platform ios --profile development
```

### Staging Build

Use after preflight succeeds and the staging Supabase environment is ready.

```bash
eas build --platform android --profile staging
```

Optional iOS build:

```bash
eas build --platform ios --profile staging
```

### Production Build

Use only after the staging checklist passes and production secrets plus migrations have been reviewed.

```bash
eas build --platform android --profile production
```

Optional iOS build:

```bash
eas build --platform ios --profile production
```

## Staging Validation Gates

A staging build should not be promoted unless these pass:

1. sign-up and sign-in
2. password reset
3. listing create and edit
4. buyer inquiry
5. seller reply
6. seller verification submit
7. admin moderation review
8. notification inbox read state
9. offline cached read flows still open feed, listing detail, and conversations
10. queued offline inquiry and reply actions sync after reconnect

## Production Promotion Gates

A production build should not be released unless:

1. the staging validation gates passed on the same release candidate code line
2. reviewed migrations are already applied to production
3. production Edge Function secrets were verified before build promotion
4. rollback steps were reviewed for app, functions, and schema
5. the release record below is completed

## Release Record

Record one entry for each staging and production candidate.

Template:

```text
Release name:
Date:
Owner:
Git commit:
EAS profile:
Platform:
APP_ENV:
Supabase project ref:
Applied migrations:
Deployed functions:
EAS build id:
App version:
Smoke test result:
Rollback doc reviewed: yes/no
Notes:
```

## Expected Outputs

Every production candidate should produce:

- an EAS build id
- a traced git commit
- a confirmed target Supabase project
- a confirmed migration state
- a short smoke-test result
- a rollback-ready note

## Current Manual Steps

These steps still require manual operator discipline:

- copying real staging and production secrets into the correct stores
- confirming the correct Supabase project is linked before `db push`
- deploying Edge Functions to the correct target project
- running smoke tests on built binaries
- documenting the release record after build completion

## Remaining Gaps

This production build plan improves release discipline, but Workstream 7 is still not complete because:

- real staging and production build execution has not been proven end to end from this repo alone
- secret rollout is still manual
- smoke validation is still manual
- there is still no automated release-candidate promotion flow
