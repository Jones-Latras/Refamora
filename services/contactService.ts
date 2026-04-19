import type {
  ContactConversation,
  ContactRequestMessage,
  ContactRequestSummary,
  ServiceResult,
} from '../types/app'
import type { Tables, TablesInsert } from '../types/database'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type ContactRequest = Tables<'contact_requests'>
type ContactRequestMessageRow = Tables<'contact_request_messages'>
type ListingRow = Tables<'listings'>
type UserRow = Tables<'users'>
type CounterpartKind = 'buyer' | 'seller'

const GENERIC_PROFILE_NAMES = new Set([
  'buyer',
  'seller',
  'user',
  'new user',
  'unknown user',
])

function dedupe(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function toDisplayNameFromEmail(email: string | null | undefined) {
  const localPart = email?.split('@')[0]?.trim() ?? ''

  if (!localPart) {
    return null
  }

  const normalized = localPart
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) {
    return null
  }

  return normalized
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getCounterpartDisplayName(
  counterpart: Pick<UserRow, 'full_name' | 'email'> | undefined,
  counterpartKind: CounterpartKind,
) {
  const fullName = counterpart?.full_name?.trim() ?? ''

  if (fullName && !GENERIC_PROFILE_NAMES.has(fullName.toLowerCase())) {
    return fullName
  }

  const emailBasedName = toDisplayNameFromEmail(counterpart?.email)

  if (emailBasedName && !GENERIC_PROFILE_NAMES.has(emailBasedName.toLowerCase())) {
    return emailBasedName
  }

  return counterpartKind === 'seller' ? 'Seller profile' : 'Buyer profile'
}

function mapMessageRow(row: ContactRequestMessageRow): ContactRequestMessage {
  return {
    id: row.id,
    requestId: row.request_id,
    senderId: row.sender_id,
    message: row.message,
    createdAt: row.created_at,
  }
}

async function enrichRequests(
  requests: ContactRequest[],
  counterpartBy: CounterpartKind,
): Promise<ContactRequestSummary[]> {
  if (requests.length === 0) {
    return []
  }

  const requestIds = dedupe(requests.map((request) => request.id))
  const listingIds = dedupe(requests.map((request) => request.listing_id))
  const counterpartIds = dedupe(
    requests.map((request) =>
      counterpartBy === 'seller' ? request.seller_id : request.buyer_id,
    ),
  )

  const [listingsResult, usersResult, messagesResult] = await Promise.all([
    getSupabaseClient()
      .from('listings')
      .select('id, title, image_url')
      .in('id', listingIds),
    getSupabaseClient()
      .from('users')
      .select('id, full_name, email, phone, city, avatar_url')
      .in('id', counterpartIds),
    getSupabaseClient()
      .from('contact_request_messages')
      .select('id, request_id, sender_id, message, created_at')
      .in('request_id', requestIds)
      .order('created_at', { ascending: false }),
  ])

  const listingsById = new Map<
    string,
    Pick<ListingRow, 'id' | 'title' | 'image_url'>
  >(
    (listingsResult.data ?? []).map((listing) => [listing.id, listing]),
  )
  const usersById = new Map<
    string,
    Pick<UserRow, 'id' | 'full_name' | 'email' | 'phone' | 'city' | 'avatar_url'>
  >((usersResult.data ?? []).map((user) => [user.id, user]))
  const latestMessageByRequestId = new Map<string, ContactRequestMessageRow>()
  const messageCountByRequestId = new Map<string, number>()

  for (const message of messagesResult.data ?? []) {
    messageCountByRequestId.set(
      message.request_id,
      (messageCountByRequestId.get(message.request_id) ?? 0) + 1,
    )

    if (!latestMessageByRequestId.has(message.request_id)) {
      latestMessageByRequestId.set(message.request_id, message)
    }
  }

  return requests.map((request) => {
    const counterpartId =
      counterpartBy === 'seller' ? request.seller_id : request.buyer_id
    const counterpart = usersById.get(counterpartId)
    const listing = listingsById.get(request.listing_id)
    const latestMessage = latestMessageByRequestId.get(request.id)
    const fallbackMessage = request.message?.trim() || null

    return {
      id: request.id,
      listingId: request.listing_id,
      listingTitle: listing?.title ?? 'Untitled listing',
      listingImageUrl: listing?.image_url ?? null,
      buyerId: request.buyer_id,
      buyerLastReadAt: request.buyer_last_read_at ?? null,
      sellerId: request.seller_id,
      counterpartName: getCounterpartDisplayName(counterpart, counterpartBy),
      counterpartAvatarUrl: counterpart?.avatar_url ?? null,
      counterpartPhone: counterpart?.phone ?? null,
      counterpartCity: counterpart?.city ?? null,
      message: latestMessage?.message ?? fallbackMessage,
      messageCount:
        messageCountByRequestId.get(request.id) ??
        (fallbackMessage ? 1 : 0),
      lastMessageSenderId:
        latestMessage?.sender_id ?? (fallbackMessage ? request.buyer_id : null),
      status: request.status as ContactRequestSummary['status'],
      createdAt: request.created_at,
      updatedAt: latestMessage?.created_at ?? request.updated_at ?? request.created_at,
    }
  })
}

export async function sendContactRequest(
  payload: TablesInsert<'contact_requests'>,
): Promise<ServiceResult<ContactRequest>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const normalizedPayload = {
    ...payload,
    message: payload.message?.trim() || null,
  }

  const { data, error } = await getSupabaseClient()
    .from('contact_requests')
    .insert(normalizedPayload)
    .select()
    .single()

  return { data, error }
}

export async function sendContactRequestMessage(
  payload: TablesInsert<'contact_request_messages'>,
): Promise<ServiceResult<ContactRequestMessageRow>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const normalizedMessage = payload.message.trim()

  if (!normalizedMessage) {
    return { data: null, error: new Error('Write a message before sending it.') }
  }

  const { data, error } = await getSupabaseClient()
    .from('contact_request_messages')
    .insert({
      ...payload,
      message: normalizedMessage,
    })
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
    .order('updated_at', { ascending: false })

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
    .order('updated_at', { ascending: false })

  if (error) {
    return { data: [], error }
  }

  return { data: await enrichRequests(data ?? [], 'buyer'), error: null }
}

export async function getContactConversation(
  requestId: string,
  actorId: string,
): Promise<ServiceResult<ContactConversation>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const requestResult = await getSupabaseClient()
    .from('contact_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle()

  if (requestResult.error) {
    return { data: null, error: requestResult.error }
  }

  const request = requestResult.data

  if (!request) {
    return { data: null, error: new Error('This conversation could not be found.') }
  }

  const counterpartBy = actorId === request.buyer_id ? 'seller' : 'buyer'
  const [summaryList, messagesResult] = await Promise.all([
    enrichRequests([request], counterpartBy),
    getSupabaseClient()
      .from('contact_request_messages')
      .select('id, request_id, sender_id, message, created_at')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true }),
  ])

  if (messagesResult.error) {
    return { data: null, error: messagesResult.error }
  }

  const summary = summaryList[0]

  if (!summary) {
    return { data: null, error: new Error('This conversation could not be loaded.') }
  }

  return {
    data: {
      request: summary,
      messages: (messagesResult.data ?? []).map(mapMessageRow),
    },
    error: null,
  }
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

export async function markInquirySeen(
  requestId: string,
  sellerId: string,
): Promise<ServiceResult<ContactRequest>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const { data, error } = await getSupabaseClient()
    .from('contact_requests')
    .update({ status: 'seen' })
    .eq('id', requestId)
    .eq('seller_id', sellerId)
    .eq('status', 'pending')
    .select()
    .maybeSingle()

  return { data, error }
}

export async function markBuyerConversationRead(
  requestId: string,
): Promise<ServiceResult<ContactRequest>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const { data, error } = await getSupabaseClient().rpc(
    'mark_buyer_conversation_read',
    {
      p_request_id: requestId,
    },
  )

  return { data, error }
}
