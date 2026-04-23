import type {
  ServiceResult,
  UserNotification,
  UserNotificationEntityType,
  UserNotificationKind,
} from '../types/app'
import type { Tables } from '../types/database'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type UserNotificationRow = Tables<'user_notifications'>

function normalizeNotificationKind(value: string | null | undefined): UserNotificationKind {
  switch (value) {
    case 'reply_received':
    case 'verification_approved':
    case 'verification_rejected':
      return value
    default:
      return 'inquiry_received'
  }
}

function normalizeEntityType(
  value: string | null | undefined,
): UserNotificationEntityType | null {
  if (value === 'contact_request' || value === 'seller_verification_request') {
    return value
  }

  return null
}

function mapNotification(row: UserNotificationRow): UserNotification {
  return {
    id: row.id,
    userId: row.user_id,
    kind: normalizeNotificationKind(row.kind),
    title: row.title,
    body: row.body,
    entityType: normalizeEntityType(row.entity_type),
    entityId: row.entity_id,
    isRead: row.is_read,
    readAt: row.read_at,
    createdAt: row.created_at,
  }
}

export async function getUserNotifications(
  userId: string,
): Promise<ServiceResult<UserNotification[]>> {
  if (!hasSupabaseEnv) {
    return { data: [], error: null }
  }

  const { data, error } = await getSupabaseClient()
    .from('user_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return { data: (data ?? []).map(mapNotification), error }
}

export async function getUnreadNotificationCount(
  userId: string,
): Promise<ServiceResult<number>> {
  if (!hasSupabaseEnv) {
    return { data: 0, error: null }
  }

  const { count, error } = await getSupabaseClient()
    .from('user_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  return { data: count ?? 0, error }
}

export async function markNotificationsRead(
  notificationIds?: string[],
): Promise<ServiceResult<UserNotification[]>> {
  if (!hasSupabaseEnv) {
    return { data: [], error: null }
  }

  const { data, error } = await getSupabaseClient().rpc(
    'mark_user_notifications_read',
    {
      p_notification_ids:
        notificationIds && notificationIds.length > 0 ? notificationIds : null,
    },
  )

  return {
    data: (data ?? []).map((row) => mapNotification(row as UserNotificationRow)),
    error,
  }
}
