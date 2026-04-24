const fs = require('node:fs')
const path = require('node:path')

function readFile(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function main() {
  const supabaseConfig = readFile('supabase/config.toml')
  const easConfig = JSON.parse(readFile('eas.json'))

  assert(
    !supabaseConfig.includes('verify_jwt = false'),
    'Supabase function config still contains verify_jwt = false.',
  )
  assert(
    supabaseConfig.includes('verify_jwt = true'),
    'Supabase function config must enable verify_jwt for deployed functions.',
  )

  const buildProfiles = easConfig.build ?? {}
  for (const profile of ['development', 'staging', 'production']) {
    assert(buildProfiles[profile], `Missing EAS build profile: ${profile}.`)
    assert(
      buildProfiles[profile].env?.APP_ENV === profile,
      `EAS profile ${profile} must set APP_ENV=${profile}.`,
    )
  }

  for (const migrationFile of [
    'supabase/migrations/202604230002_admin_moderation_foundation.sql',
    'supabase/migrations/202604230003_seller_verification_phase1.sql',
    'supabase/migrations/202604230004_user_notifications_foundation.sql',
    'supabase/migrations/202604230005_admin_audit_log.sql',
    'supabase/migrations/202604230006_app_runtime_policies.sql',
    'supabase/migrations/202604240001_app_crash_reports.sql',
  ]) {
    assert(fs.existsSync(path.join(process.cwd(), migrationFile)), `Missing migration: ${migrationFile}`)
  }

  console.log('Beta config checks passed.')
}

main()
