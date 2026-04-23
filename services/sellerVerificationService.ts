import type {
  AdminSellerVerificationItem,
  SellerVerificationDocumentType,
  SellerVerificationRequest,
  SellerVerificationRequestStatus,
  ServiceResult,
} from '../types/app'
import type { TablesInsert } from '../types/database'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

function normalizeRequestStatus(
  value: string | null | undefined,
): SellerVerificationRequestStatus {
  if (value === 'approved' || value === 'rejected') {
    return value
  }

  return 'pending'
}

function normalizeDocumentType(
  value: string | null | undefined,
): SellerVerificationDocumentType {
  switch (value) {
    case 'government_id':
    case 'farm_id':
    case 'business_permit':
    case 'cooperative_certificate':
      return value
    default:
      return 'other'
  }
}

function mapSellerVerificationRequest(
  row: Record<string, unknown> | null | undefined,
): SellerVerificationRequest | null {
  if (!row || typeof row !== 'object' || typeof row.id !== 'string') {
    return null
  }

  return {
    id: row.id,
    sellerId: typeof row.seller_id === 'string' ? row.seller_id : '',
    documentType: normalizeDocumentType(
      typeof row.document_type === 'string' ? row.document_type : null,
    ),
    documentNumber:
      typeof row.document_number === 'string' ? row.document_number : '',
    notes: typeof row.notes === 'string' ? row.notes : null,
    documentPath: typeof row.document_path === 'string' ? row.document_path : '',
    status: normalizeRequestStatus(
      typeof row.status === 'string' ? row.status : null,
    ),
    adminNote: typeof row.admin_note === 'string' ? row.admin_note : null,
    reviewedAt: typeof row.reviewed_at === 'string' ? row.reviewed_at : null,
    createdAt:
      typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    updatedAt:
      typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
  }
}

export async function getLatestSellerVerificationRequest(
  sellerId: string,
): Promise<ServiceResult<SellerVerificationRequest>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const { data, error } = await getSupabaseClient()
    .from('seller_verification_requests')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    data: mapSellerVerificationRequest(data as Record<string, unknown> | null | undefined),
    error,
  }
}

export async function submitSellerVerificationRequest(input: {
  sellerId: string
  documentType: SellerVerificationDocumentType
  documentNumber: string
  notes?: string | null
  documentPath: string
}): Promise<ServiceResult<SellerVerificationRequest>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const { data: pendingRequest, error: pendingError } = await getSupabaseClient()
    .from('seller_verification_requests')
    .select('*')
    .eq('seller_id', input.sellerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (pendingError) {
    return { data: null, error: pendingError }
  }

  if (pendingRequest?.id) {
    const { data, error } = await getSupabaseClient()
      .from('seller_verification_requests')
      .update({
        document_type: input.documentType,
        document_number: input.documentNumber.trim(),
        notes: input.notes?.trim() || null,
        document_path: input.documentPath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pendingRequest.id)
      .select()
      .single()

    return {
      data: mapSellerVerificationRequest(data as Record<string, unknown> | null | undefined),
      error,
    }
  }

  const payload: TablesInsert<'seller_verification_requests'> = {
    seller_id: input.sellerId,
    document_type: input.documentType,
    document_number: input.documentNumber.trim(),
    notes: input.notes?.trim() || null,
    document_path: input.documentPath,
  }

  const { data, error } = await getSupabaseClient()
    .from('seller_verification_requests')
    .insert(payload)
    .select()
    .single()

  return {
    data: mapSellerVerificationRequest(data as Record<string, unknown> | null | undefined),
    error,
  }
}

export async function getAdminSellerVerificationRequests(
  status: SellerVerificationRequestStatus | 'all' = 'all',
): Promise<ServiceResult<AdminSellerVerificationItem[]>> {
  if (!hasSupabaseEnv) {
    return { data: [], error: null }
  }

  let query = getSupabaseClient()
    .from('seller_verification_requests')
    .select(
      `
        id,
        seller_id,
        document_type,
        document_number,
        notes,
        document_path,
        status,
        admin_note,
        reviewed_at,
        created_at,
        updated_at,
        seller:users!seller_verification_requests_seller_id_fkey(
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
      seller:
        row.seller && typeof row.seller === 'object'
          ? (() => {
              const sellerRow = row.seller as Record<string, unknown>

              return {
                id: typeof sellerRow.id === 'string' ? sellerRow.id : '',
                fullName:
                  typeof sellerRow.full_name === 'string'
                    ? sellerRow.full_name
                    : 'Unknown seller',
                email: typeof sellerRow.email === 'string' ? sellerRow.email : null,
                city: typeof sellerRow.city === 'string' ? sellerRow.city : null,
              }
            })()
          : null,
      id: typeof row.id === 'string' ? row.id : '',
      sellerId: typeof row.seller_id === 'string' ? row.seller_id : '',
      documentType: normalizeDocumentType(
        typeof row.document_type === 'string' ? row.document_type : null,
      ),
      documentNumber:
        typeof row.document_number === 'string' ? row.document_number : '',
      notes: typeof row.notes === 'string' ? row.notes : null,
      documentPath: typeof row.document_path === 'string' ? row.document_path : '',
      status: normalizeRequestStatus(typeof row.status === 'string' ? row.status : null),
      adminNote: typeof row.admin_note === 'string' ? row.admin_note : null,
      reviewedAt: typeof row.reviewed_at === 'string' ? row.reviewed_at : null,
      createdAt:
        typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
      updatedAt:
        typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
    })),
    error: null,
  }
}

export async function updateAdminSellerVerificationStatus(input: {
  requestId: string
  sellerId: string
  status: SellerVerificationRequestStatus
  adminNote?: string | null
  reviewerId: string
}): Promise<ServiceResult<null>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const reviewedAt = input.status === 'pending' ? null : new Date().toISOString()
  const { error: requestError } = await getSupabaseClient()
    .from('seller_verification_requests')
    .update({
      status: input.status,
      admin_note: input.adminNote?.trim() || null,
      reviewed_by: input.status === 'pending' ? null : input.reviewerId,
      reviewed_at: reviewedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.requestId)

  if (requestError) {
    return { data: null, error: requestError }
  }

  const { error: sellerError } = await getSupabaseClient()
    .from('users')
    .update({
      is_verified: input.status === 'approved',
    })
    .eq('id', input.sellerId)

  return { data: null, error: sellerError }
}
