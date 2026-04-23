import type {
  AdminAuditActionType,
  AdminAuditEntityType,
  AdminAuditLogItem,
  AdminUserSummary,
  ServiceResult,
} from '../types/app'
import type { Json, Tables } from '../types/database'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type AdminAuditLogRow = Tables<'admin_action_logs'>

function normalizeActionType(value: string | null | undefined): AdminAuditActionType {
  switch (value) {
    case 'review_queue_updated':
    case 'listing_status_updated':
    case 'seller_verification_updated':
      return value
    default:
      return 'listing_report_updated'
  }
}

function normalizeEntityType(value: string | null | undefined): AdminAuditEntityType {
  switch (value) {
    case 'listing_review_queue':
    case 'listing':
    case 'seller_verification_request':
      return value
    default:
      return 'listing_report'
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
    fullName: typeof row.full_name === 'string' ? row.full_name : 'Unknown admin',
    email: typeof row.email === 'string' ? row.email : null,
    city: typeof row.city === 'string' ? row.city : null,
  }
}

function mapAuditLog(row: Record<string, unknown>): AdminAuditLogItem {
  return {
    id: typeof row.id === 'string' ? row.id : '',
    adminId: typeof row.admin_id === 'string' ? row.admin_id : '',
    actionType: normalizeActionType(typeof row.action_type === 'string' ? row.action_type : null),
    entityType: normalizeEntityType(typeof row.entity_type === 'string' ? row.entity_type : null),
    entityId: typeof row.entity_id === 'string' ? row.entity_id : '',
    metadata: normalizeMetadata(row.metadata as Json | null | undefined),
    createdAt:
      typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    admin: mapAdminUser(row.admin as Record<string, unknown> | null | undefined),
  }
}

export async function getAdminAuditLogs(): Promise<ServiceResult<AdminAuditLogItem[]>> {
  if (!hasSupabaseEnv) {
    return { data: [], error: null }
  }

  const { data, error } = await getSupabaseClient()
    .from('admin_action_logs')
    .select(
      `
        id,
        admin_id,
        action_type,
        entity_type,
        entity_id,
        metadata,
        created_at,
        admin:users!admin_action_logs_admin_id_fkey(
          id,
          full_name,
          email,
          city
        )
      `,
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return { data: null, error }
  }

  return {
    data: (data ?? []).map((row) => mapAuditLog(row as Record<string, unknown>)),
    error: null,
  }
}
