import type {
  ListingPin,
  ListingPreview,
  ListingStatus,
  ServiceResult,
} from '../types/app'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type ListingRow = Tables<'listings'>

function mapListing(row: ListingRow): ListingPreview {
  return {
    id: row.id,
    title: row.title,
    wasteType: row.waste_type,
    price: row.price,
    unit: row.unit,
    quantity: row.quantity,
    city: row.city ?? 'Unknown location',
    imageUrl: row.image_url,
    status: row.status,
    sellerName: null,
    fulfillmentType: row.fulfillment_type,
    createdAt: row.created_at ?? new Date().toISOString(),
  }
}

export async function getBuyerFeed(): Promise<ServiceResult<ListingPreview[]>> {
  if (!hasSupabaseEnv) {
    return { data: [], error: null }
  }

  const { data, error } = await getSupabaseClient()
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(0, 11)

  return { data: data?.map(mapListing) ?? [], error }
}

export async function getFarmerListings(
  sellerId: string,
): Promise<ServiceResult<ListingPreview[]>> {
  if (!hasSupabaseEnv) {
    return { data: [], error: null }
  }

  const { data, error } = await getSupabaseClient()
    .from('listings')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })

  return { data: data?.map(mapListing) ?? [], error }
}

export async function getListingById(
  listingId: string,
): Promise<ServiceResult<ListingRow>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const { data, error } = await getSupabaseClient()
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .single()

  return { data, error }
}

export async function createListing(
  listing: TablesInsert<'listings'>,
): Promise<ServiceResult<ListingRow>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const { data, error } = await getSupabaseClient()
    .from('listings')
    .insert(listing)
    .select()
    .single()

  return { data, error }
}

export async function updateListing(
  listingId: string,
  updates: TablesUpdate<'listings'>,
): Promise<ServiceResult<ListingRow>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const { data, error } = await getSupabaseClient()
    .from('listings')
    .update(updates)
    .eq('id', listingId)
    .select()
    .single()

  return { data, error }
}

export async function setListingStatus(
  listingId: string,
  status: ListingStatus,
) {
  return updateListing(listingId, { status })
}

export async function getListingPins(): Promise<ServiceResult<ListingPin[]>> {
  if (!hasSupabaseEnv) {
    return { data: [], error: null }
  }

  const { data, error } = await getSupabaseClient()
    .from('listings')
    .select('id,title,latitude,longitude,waste_type')
    .eq('status', 'active')

  return {
    data:
      data
        ?.filter((item) => item.latitude != null && item.longitude != null)
        .map((item) => ({
          id: item.id,
          title: item.title,
          latitude: item.latitude as number,
          longitude: item.longitude as number,
          wasteType: item.waste_type,
        })) ?? [],
    error,
  }
}
