import type { ContactRequestSummary, ServiceResult } from '../types/app'
import type { Tables, TablesInsert } from '../types/database'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type ContactRequest = Tables<'contact_requests'>
type ListingRow = Tables<'listings'>
type UserRow = Tables<'users'>

function dedupe(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

async function enrichRequests(
  requests: ContactRequest[],
  counterpartBy: 'buyer' | 'seller',
): Promise<ContactRequestSummary[]> {
  if (requests.length === 0) {
    return []
  }

  const listingIds = dedupe(requests.map((request) => request.listing_id))
  const counterpartIds = dedupe(
    requests.map((request) =>
      counterpartBy === 'seller' ? request.seller_id : request.buyer_id,
    ),
  )

  const [listingsResult, usersResult] = await Promise.all([
    getSupabaseClient()
      .from('listings')
      .select('id, title')
      .in('id', listingIds),
    getSupabaseClient()
      .from('users')
      .select('id, full_name, phone, city')
      .in('id', counterpartIds),
  ])

  const listingsById = new Map<string, Pick<ListingRow, 'id' | 'title'>>(
    (listingsResult.data ?? []).map((listing) => [listing.id, listing]),
  )
  const usersById = new Map<
    string,
    Pick<UserRow, 'id' | 'full_name' | 'phone' | 'city'>
  >((usersResult.data ?? []).map((user) => [user.id, user]))

  return requests.map((request) => {
    const counterpartId =
      counterpartBy === 'seller' ? request.seller_id : request.buyer_id
    const counterpart = usersById.get(counterpartId)
    const listing = listingsById.get(request.listing_id)

    return {
      id: request.id,
      listingId: request.listing_id,
      listingTitle: listing?.title ?? 'Untitled listing',
      buyerId: request.buyer_id,
      sellerId: request.seller_id,
      counterpartName: counterpart?.full_name ?? 'Unknown user',
      counterpartPhone: counterpart?.phone ?? null,
      counterpartCity: counterpart?.city ?? null,
      message: request.message,
      status: request.status,
      createdAt: request.created_at,
    }
  })
}

export async function sendContactRequest(
  payload: TablesInsert<'contact_requests'>,
): Promise<ServiceResult<ContactRequest>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const { data, error } = await getSupabaseClient()
    .from('contact_requests')
    .insert(payload)
    .select()
    .single()

  return { data, error }
}

export async function getSentContactRequests(
  buyerId: string,
): Promise<ServiceResult<ContactRequestSummary[]>> {
  return getBuyerContactRequests(buyerId)
}

export async function getBuyerContactRequests(
  buyerId: string,
): Promise<ServiceResult<ContactRequestSummary[]>> {
  if (!hasSupabaseEnv) {
    return { data: [], error: null }
  }

  const { data, error } = await getSupabaseClient()
    .from('contact_requests')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: [], error }
  }

  return { data: await enrichRequests(data ?? [], 'seller'), error: null }
}

export async function getReceivedContactRequests(
  sellerId: string,
): Promise<ServiceResult<ContactRequestSummary[]>> {
  return getSellerInquiries(sellerId)
}

export async function getSellerInquiries(
  sellerId: string,
): Promise<ServiceResult<ContactRequestSummary[]>> {
  if (!hasSupabaseEnv) {
    return { data: [], error: null }
  }

  const { data, error } = await getSupabaseClient()
    .from('contact_requests')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: [], error }
  }

  return { data: await enrichRequests(data ?? [], 'buyer'), error: null }
}

export async function markSellerInquiriesSeen(
  sellerId: string,
): Promise<ServiceResult<ContactRequest[]>> {
  if (!hasSupabaseEnv) {
    return { data: [], error: null }
  }

  const { data, error } = await getSupabaseClient()
    .from('contact_requests')
    .update({ status: 'seen' })
    .eq('seller_id', sellerId)
    .eq('status', 'pending')
    .select()

  return { data: data ?? [], error }
}
