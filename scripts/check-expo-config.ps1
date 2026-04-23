$ErrorActionPreference = 'Stop'

function Assert($Condition, [string]$Message) {
  if (-not $Condition) {
    throw $Message
  }
}

function Get-ExpoConfigForScenario([string]$AppEnv, [string]$SupabaseUrl) {
  $previousAppEnv = $env:APP_ENV
  $previousSupabaseUrl = $env:SUPABASE_URL
  $previousSupabaseAnonKey = $env:SUPABASE_ANON_KEY
  $previousAiEnabled = $env:EXPO_PUBLIC_AI_LISTING_ASSIST_ENABLED

  try {
    $env:APP_ENV = $AppEnv
    $env:SUPABASE_URL = $SupabaseUrl
    $env:SUPABASE_ANON_KEY = 'test-anon-key'
    $env:EXPO_PUBLIC_AI_LISTING_ASSIST_ENABLED = 'true'

    $raw = npx expo config --json
    return $raw | ConvertFrom-Json
  }
  finally {
    $env:APP_ENV = $previousAppEnv
    $env:SUPABASE_URL = $previousSupabaseUrl
    $env:SUPABASE_ANON_KEY = $previousSupabaseAnonKey
    $env:EXPO_PUBLIC_AI_LISTING_ASSIST_ENABLED = $previousAiEnabled
  }
}

function Test-Scenario(
  [string]$Label,
  [string]$AppEnv,
  [string]$SupabaseUrl,
  [string]$ExpectedName,
  [string]$ExpectedBundleId,
  [bool]$ExpectedCleartext
) {
  $config = Get-ExpoConfigForScenario -AppEnv $AppEnv -SupabaseUrl $SupabaseUrl

  Assert ($config.name -eq $ExpectedName) "${Label}: unexpected app name."
  Assert ($config.ios.bundleIdentifier -eq $ExpectedBundleId) "${Label}: unexpected iOS bundle identifier."
  Assert ($config.android.package -eq $ExpectedBundleId) "${Label}: unexpected Android package."
  Assert ($config.android.usesCleartextTraffic -eq $ExpectedCleartext) "${Label}: unexpected cleartext setting."
}

Test-Scenario `
  -Label 'development-http' `
  -AppEnv 'development' `
  -SupabaseUrl 'http://127.0.0.1:54321' `
  -ExpectedName 'Refamora Dev' `
  -ExpectedBundleId 'com.refamora.app.development' `
  -ExpectedCleartext $true

Test-Scenario `
  -Label 'staging-https' `
  -AppEnv 'staging' `
  -SupabaseUrl 'https://staging-project.supabase.co' `
  -ExpectedName 'Refamora Staging' `
  -ExpectedBundleId 'com.refamora.app.staging' `
  -ExpectedCleartext $false

Test-Scenario `
  -Label 'production-https' `
  -AppEnv 'production' `
  -SupabaseUrl 'https://production-project.supabase.co' `
  -ExpectedName 'Refamora' `
  -ExpectedBundleId 'com.refamora.app' `
  -ExpectedCleartext $false

Write-Output 'Expo config checks passed.'
