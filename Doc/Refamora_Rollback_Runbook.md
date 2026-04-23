# Refamora Rollback Runbook

This runbook documents the current rollback procedure for Beta releases as of **April 23, 2026**.

## When To Use It

Use this when a staging or production rollout causes a blocking issue in:

- sign-in or session restore
- listing publish or edit
- buyer inquiry or seller reply
- admin moderation
- seller verification
- notification inbox behavior

## Immediate Response

1. Stop distributing the new build.
2. Pause any additional database or Edge Function deploys.
3. Record the failing build id, migration state, affected environment, and first user-visible symptom.
4. Decide whether the issue is app-only, function-only, or schema-related.

## App Build Rollback

Use when the schema is still compatible and the regression is in the client app.

1. Identify the last known good EAS build for the same environment.
2. Re-issue that build to internal testers or submit it again if store workflow requires it.
3. Keep database migrations in place only if the older app still works with the current schema.
4. Re-run the staging smoke checklist against the rolled-back build.

## Edge Function Rollback

Use when the issue is isolated to AI or function behavior.

1. Re-deploy the previous known good function revision.
2. Confirm `verify_jwt` remains enabled.
3. Re-test auth-protected function calls:
   - AI listing assist
   - AI waste advice
   - AI search assist
   - AI listing moderation
   - AI photo check
   - AI inquiry assist

## Database Rollback Guidance

Do not treat schema rollback as the default first move.

Use this order instead:

1. Prefer rolling back the app or functions first.
2. If a migration must be reversed, stop writes that depend on the broken schema path.
3. Restore from a verified backup or write a forward fix migration if data has already been written.
4. Regenerate `types/database.ts` after the schema is stabilized.

For the current repo, later Beta migrations are additive. That lowers rollback risk, but real production rollback still depends on the target Supabase project backup policy.

## Recovery Validation

After rollback, verify:

- user auth still works
- listings can be viewed and created
- buyer inquiry and seller reply still work
- admin moderation still loads
- seller verification screens still load
- notifications still load

## Follow-Up

Before retrying release:

1. identify the exact failing change
2. add or extend an automated repo check when possible
3. update the release runbook if the failure exposed a missing step
