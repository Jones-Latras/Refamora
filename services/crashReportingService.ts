import Constants from 'expo-constants'
import { Platform } from 'react-native'

import type {
  AppEnvironment,
  CrashReportSeverity,
  CrashReportSource,
  ServiceResult,
  UserRole,
} from '../types/app'
import type { Json, TablesInsert } from '../types/database'
import { createCrashFingerprint, serializeCrashError } from '../utils/crashReporting'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type ExpoExtra = {
  appEnv?: AppEnvironment
}

type CrashReportInput = {
  source: CrashReportSource
  severity: CrashReportSeverity
  error: unknown
  route?: string | null
  userId?: string | null
  userRole?: UserRole | null
  componentStack?: string | null
  metadata?: Record<string, unknown> | null
}

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra
const recentCrashFingerprints = new Map<string, number>()
const CRASH_DEDUPE_WINDOW_MS = 60_000
const MAX_RECENT_CRASHES = 30

function getCurrentAppEnvironment(): AppEnvironment {
  if (extra.appEnv === 'staging' || extra.appEnv === 'production') {
    return extra.appEnv
  }

  return 'development'
}

function getCurrentAppVersion() {
  return Constants.expoConfig?.version?.trim() ?? null
}

function normalizeJsonValue(value: unknown): Json {
  try {
    return JSON.parse(JSON.stringify(value ?? {})) as Json
  } catch {
    return {}
  }
}

function shouldSkipCrashReport(fingerprint: string) {
  const now = Date.now()
  const lastSeenAt = recentCrashFingerprints.get(fingerprint)

  if (typeof lastSeenAt === 'number' && now - lastSeenAt < CRASH_DEDUPE_WINDOW_MS) {
    return true
  }

  recentCrashFingerprints.set(fingerprint, now)

  if (recentCrashFingerprints.size > MAX_RECENT_CRASHES) {
    const oldestKey = recentCrashFingerprints.keys().next().value

    if (typeof oldestKey === 'string') {
      recentCrashFingerprints.delete(oldestKey)
    }
  }

  return false
}

export async function reportAppCrash(
  input: CrashReportInput,
): Promise<ServiceResult<string>> {
  const normalizedError = serializeCrashError(input.error)
  const fingerprint = createCrashFingerprint({
    source: input.source,
    message: normalizedError.message,
    route: input.route,
    stack: normalizedError.stack,
  })

  if (shouldSkipCrashReport(fingerprint)) {
    return { data: null, error: null }
  }

  if (!hasSupabaseEnv) {
    return { data: null, error: null }
  }

  const payload: TablesInsert<'app_crash_reports'> = {
    user_id: input.userId ?? null,
    source: input.source,
    severity: input.severity,
    message: normalizedError.message,
    stack: normalizedError.stack,
    component_stack: input.componentStack?.trim() || null,
    route: input.route?.trim() || null,
    app_env: getCurrentAppEnvironment(),
    app_version: getCurrentAppVersion(),
    platform: Platform.OS,
    metadata: normalizeJsonValue({
      userRole: input.userRole ?? null,
      ...input.metadata,
    }),
  }

  const { data, error } = await getSupabaseClient()
    .from('app_crash_reports')
    .insert(payload)
    .select('id')
    .single()

  return {
    data: data?.id ?? null,
    error,
  }
}
