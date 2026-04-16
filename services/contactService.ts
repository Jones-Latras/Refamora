import type { ServiceResult } from '../types/app'
import type { Tables, TablesInsert } from '../types/database'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type ContactRequest = Tables<'contact_requests'>

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
): Promise<ServiceResult<ContactRequest[]>> {
  return getBuyerContactRequests(buyerId)
}

export async function getBuyerContactRequests(
  buyerId: string,
): Promise<ServiceResult<ContactRequest[]>> {
  if (!hasSupabaseEnv) {
    return { data: [], error: null }
  }

  const { data, error } = await getSupabaseClient()
    .from('contact_requests')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })

  return { data: data ?? [], error }
}

export async function getReceivedContactRequests(
  sellerId: string,
): Promise<ServiceResult<ContactRequest[]>> {
  return getSellerInquiries(sellerId)
}

export async function getSellerInquiries(
  sellerId: string,
): Promise<ServiceResult<ContactRequest[]>> {
  if (!hasSupabaseEnv) {
    return { data: [], error: null }
  }

  const { data, error } = await getSupabaseClient()
    .from('contact_requests')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })

  return { data: data ?? [], error }
}
