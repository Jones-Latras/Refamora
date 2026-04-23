const fs = require('node:fs')
const path = require('node:path')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function readFile(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

function main() {
  const requiredFiles = [
    '.env.staging.example',
    '.env.production.example',
    'Doc/Refamora_Release_Runbook.md',
    'Doc/Refamora_Rollback_Runbook.md',
    'supabase/functions/.env.staging.example',
    'supabase/functions/.env.production.example',
  ]

  for (const relativePath of requiredFiles) {
    assert(fs.existsSync(path.join(process.cwd(), relativePath)), `Missing required release file: ${relativePath}`)
  }

  const runbook = readFile('Doc/Refamora_Release_Runbook.md')
  const rollbackRunbook = readFile('Doc/Refamora_Rollback_Runbook.md')
  const supabaseReadme = readFile('supabase/README.md')

  for (const marker of [
    '## Staging Checklist',
    '## Production Checklist',
    '## Supabase Deployment Order',
    '## Seed Policy',
    'Function secret templates:',
    'npm run quality:beta',
  ]) {
    assert(runbook.includes(marker), `Release runbook is missing section: ${marker}`)
  }

  for (const functionTemplate of [
    'supabase/functions/.env.local.example',
    'supabase/functions/.env.staging.example',
    'supabase/functions/.env.production.example',
  ]) {
    assert(
      runbook.includes(functionTemplate),
      `Release runbook must reference ${functionTemplate}.`,
    )
  }

  for (const marker of [
    '## App Build Rollback',
    '## Edge Function Rollback',
    '## Database Rollback Guidance',
    '## Recovery Validation',
  ]) {
    assert(rollbackRunbook.includes(marker), `Rollback runbook is missing section: ${marker}`)
  }

  for (const migrationFile of [
    '202604230002_admin_moderation_foundation.sql',
    '202604230003_seller_verification_phase1.sql',
    '202604230004_user_notifications_foundation.sql',
  ]) {
    assert(
      supabaseReadme.includes(migrationFile),
      `supabase/README.md must reference ${migrationFile}.`,
    )
  }

  console.log('Release readiness checks passed.')
}

main()
