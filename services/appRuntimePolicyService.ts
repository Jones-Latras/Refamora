import Constants from 'expo-constants'

import type { AppEnvironment, AppRuntimePolicy, ServiceResult } from '../types/app'
import type { Tables } from '../types/database'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type AppRuntimePolicyRow = Tables<'app_runtime_policies'>
type ExpoExtra = {
  appEnv?: AppEnvironment
}

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra

export function getCurrentAppEnvironment(): AppEnvironment {
  if (extra.appEnv === 'staging' || extra.appEnv === 'production') {
    return extra.appEnv
  }

  return 'development'
}

export function getCurrentAppVersion() {
  return Constants.expoConfig?.version?.trim() ?? ''
}

function mapAppRuntimePolicy(row: AppRuntimePolicyRow | null): AppRuntimePolicy | null {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    environment:
      row.environment === 'staging' || row.environment === 'production'
        ? row.environment
        : 'development',
    minimumSupportedVersion: row.minimum_supported_version,
    isEnforced: row.is_enforced,
    updateMessage: row.update_message,
    iosStoreUrl: row.ios_store_url,
    androidStoreUrl: row.android_store_url,
    updatedAt: row.updated_at,
  }
}

export async function getActiveAppRuntimePolicy(): Promise<ServiceResult<AppRuntimePolicy>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: null }
  }

  const { data, error } = await getSupabaseClient()
    .from('app_runtime_policies')
    .select('*')
    .eq('environment', getCurrentAppEnvironment())
    .maybeSingle()

  return {
    data: mapAppRuntimePolicy(data),
    error,
  }
}
