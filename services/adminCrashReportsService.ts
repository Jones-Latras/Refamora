import type {
  AdminCrashReportItem,
  AdminUserSummary,
  AppEnvironment,
  CrashReportSeverity,
  CrashReportSource,
  ServiceResult,
} from '../types/app'
import type { Json } from '../types/database'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

function normalizeSource(value: string | null | undefined): CrashReportSource {
  return value === 'react_error_boundary' ? value : 'global_js_handler'
}

function normalizeSeverity(value: string | null | undefined): CrashReportSeverity {
  return value === 'fatal' ? value : 'error'
}

function normalizeAppEnv(value: string | null | undefined): AppEnvironment {
  switch (value) {
    case 'development':
    case 'staging':
      return value
    default:
      return 'production'
  }
}

function normalizeMetadata(value: Json | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

function mapAdminUser(row: Record<string, unknown> | null | undefined): AdminUserSummary | null {
  if (!row || typeof row !== 'object') {
    return null
  }

  return {
    id: typeof row.id === 'string' ? row.id : '',
    fullName: typeof row.full_name === 'string' ? row.full_name : 'Unknown user',
    email: typeof row.email === 'string' ? row.email : null,
    city: typeof row.city === 'string' ? row.city : null,
  }
}

export async function getAdminCrashReports(
  limit = 50,
): Promise<ServiceResult<AdminCrashReportItem[]>> {
  if (!hasSupabaseEnv) {
    return { data: [], error: null }
  }

  const { data, error } = await getSupabaseClient()
    .from('app_crash_reports')
    .select(
      `
        id,
        user_id,
        source,
        severity,
        message,
        stack,
        component_stack,
        route,
        app_env,
        app_version,
        platform,
        metadata,
        created_at,
        user:users!app_crash_reports_user_id_fkey(
          id,
          full_name,
          email,
          city
        )
      `,
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { data: null, error }
  }

  return {
    data: (data ?? []).map((row: Record<string, unknown>) => ({
      id: typeof row.id === 'string' ? row.id : '',
      userId: typeof row.user_id === 'string' ? row.user_id : null,
      source: normalizeSource(typeof row.source === 'string' ? row.source : null),
      severity: normalizeSeverity(typeof row.severity === 'string' ? row.severity : null),
      message: typeof row.message === 'string' ? row.message : 'Unknown app error',
      stack: typeof row.stack === 'string' ? row.stack : null,
      componentStack: typeof row.component_stack === 'string' ? row.component_stack : null,
      route: typeof row.route === 'string' ? row.route : null,
      appEnv: normalizeAppEnv(typeof row.app_env === 'string' ? row.app_env : null),
      appVersion: typeof row.app_version === 'string' ? row.app_version : null,
      platform: typeof row.platform === 'string' ? row.platform : 'unknown',
      metadata: normalizeMetadata(row.metadata as Json | null | undefined),
      createdAt:
        typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
      user: mapAdminUser(row.user as Record<string, unknown> | null | undefined),
    })),
    error: null,
  }
}
