import type {
  AdminListingReportItem,
  AdminListingReportStatus,
  AdminListingSummary,
  AdminModerationQueueItem,
  AdminReviewQueueStatus,
  AdminUserSummary,
  ListingStatus,
  ServiceResult,
} from '../types/app'
import type { Json } from '../types/database'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type AdminStatusFilter<TStatus extends string> = TStatus | 'all'

function toStringArray(value: Json | null | undefined) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
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

function mapAdminListing(row: Record<string, unknown> | null | undefined): AdminListingSummary | null {
  if (!row || typeof row !== 'object' || typeof row.id !== 'string') {
    return null
  }

  return {
    id: row.id,
    sellerId: typeof row.seller_id === 'string' ? row.seller_id : '',
    title: typeof row.title === 'string' ? row.title : 'Untitled listing',
    wasteType: typeof row.waste_type === 'string' ? row.waste_type : 'other',
    city: typeof row.city === 'string' ? row.city : null,
    status:
      row.status === 'sold' || row.status === 'unavailable' ? row.status : 'active',
    imageUrl: typeof row.image_url === 'string' ? row.image_url : null,
  }
}

export async function getAdminListingReports(
  status: AdminStatusFilter<AdminListingReportStatus> = 'all',
): Promise<ServiceResult<AdminListingReportItem[]>> {
  if (!hasSupabaseEnv) {
    return { data: [], error: null }
  }

  let query = getSupabaseClient()
    .from('listing_reports')
    .select(
      `
        id,
        listing_id,
        reason,
        details,
        status,
        created_at,
        admin_note,
        reviewed_at,
        listing:listings!listing_reports_listing_id_fkey(
          id,
          seller_id,
          title,
          waste_type,
          city,
          status,
          image_url
        ),
        reporter:users!listing_reports_reporter_id_fkey(
          id,
          full_name,
          email,
          city
        ),
        seller:users!listing_reports_seller_id_fkey(
          id,
          full_name,
          email,
          city
        )
      `,
    )
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return { data: null, error }
  }

  return {
    data: (data ?? []).map((row: Record<string, unknown>) => ({
      id: typeof row.id === 'string' ? row.id : '',
      listingId: typeof row.listing_id === 'string' ? row.listing_id : '',
      reason: typeof row.reason === 'string' ? row.reason : 'other',
      details: typeof row.details === 'string' ? row.details : null,
      status:
        row.status === 'reviewed' || row.status === 'dismissed' ? row.status : 'pending',
      createdAt:
        typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
      adminNote: typeof row.admin_note === 'string' ? row.admin_note : null,
      reviewedAt: typeof row.reviewed_at === 'string' ? row.reviewed_at : null,
      listing: mapAdminListing(row.listing as Record<string, unknown> | null | undefined),
      reporter: mapAdminUser(row.reporter as Record<string, unknown> | null | undefined),
      seller: mapAdminUser(row.seller as Record<string, unknown> | null | undefined),
    })),
    error: null,
  }
}

export async function getAdminModerationQueue(
  status: AdminStatusFilter<AdminReviewQueueStatus> = 'all',
): Promise<ServiceResult<AdminModerationQueueItem[]>> {
  if (!hasSupabaseEnv) {
    return { data: [], error: null }
  }

  let query = getSupabaseClient()
    .from('listing_review_queue')
    .select(
      `
        id,
        listing_id,
        decision,
        queue_status,
        title,
        waste_type,
        city,
        reasons,
        field_warnings,
        image_warnings,
        created_at,
        updated_at,
        admin_note,
        reviewed_at,
        listing:listings!listing_review_queue_listing_id_fkey(
          id,
          seller_id,
          title,
          waste_type,
          city,
          status,
          image_url
        ),
        seller:users!listing_review_queue_seller_id_fkey(
          id,
          full_name,
          email,
          city
        )
      `,
    )
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query = query.eq('queue_status', status)
  }

  const { data, error } = await query

  if (error) {
    return { data: null, error }
  }

  return {
    data: (data ?? []).map((row: Record<string, unknown>) => ({
      id: typeof row.id === 'string' ? row.id : '',
      listingId: typeof row.listing_id === 'string' ? row.listing_id : null,
      decision: row.decision === 'block' ? 'block' : 'review',
      queueStatus:
        row.queue_status === 'resolved' || row.queue_status === 'dismissed'
          ? row.queue_status
          : 'pending',
      title: typeof row.title === 'string' ? row.title : 'Untitled review',
      wasteType: typeof row.waste_type === 'string' ? row.waste_type : null,
      city: typeof row.city === 'string' ? row.city : null,
      createdAt:
        typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
      updatedAt:
        typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
      adminNote: typeof row.admin_note === 'string' ? row.admin_note : null,
      reviewedAt: typeof row.reviewed_at === 'string' ? row.reviewed_at : null,
      reasons: toStringArray(row.reasons as Json | null | undefined),
      fieldWarnings: toStringArray(row.field_warnings as Json | null | undefined),
      imageWarnings: toStringArray(row.image_warnings as Json | null | undefined),
      listing: mapAdminListing(row.listing as Record<string, unknown> | null | undefined),
      seller: mapAdminUser(row.seller as Record<string, unknown> | null | undefined),
    })),
    error: null,
  }
}

export async function updateAdminListingReportStatus(input: {
  reportId: string
  status: AdminListingReportStatus
  adminNote?: string | null
  reviewerId: string
}): Promise<ServiceResult<null>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const reviewedAt = input.status === 'pending' ? null : new Date().toISOString()
  const { error } = await getSupabaseClient()
    .from('listing_reports')
    .update({
      status: input.status,
      admin_note: input.adminNote?.trim() || null,
      reviewed_by: input.status === 'pending' ? null : input.reviewerId,
      reviewed_at: reviewedAt,
    })
    .eq('id', input.reportId)

  return { data: null, error }
}

export async function updateAdminModerationQueueStatus(input: {
  queueId: string
  status: AdminReviewQueueStatus
  adminNote?: string | null
  reviewerId: string
}): Promise<ServiceResult<null>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const reviewedAt = input.status === 'pending' ? null : new Date().toISOString()
  const { error } = await getSupabaseClient()
    .from('listing_review_queue')
    .update({
      queue_status: input.status,
      admin_note: input.adminNote?.trim() || null,
      reviewed_by: input.status === 'pending' ? null : input.reviewerId,
      reviewed_at: reviewedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.queueId)

  return { data: null, error }
}

export async function updateAdminListingStatus(input: {
  listingId: string
  status: ListingStatus
}): Promise<ServiceResult<null>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const { error } = await getSupabaseClient()
    .from('listings')
    .update({ status: input.status })
    .eq('id', input.listingId)

  return { data: null, error }
}
