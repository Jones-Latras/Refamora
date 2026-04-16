import type {
  ListingDetail,
  ListingFilters,
  ListingPin,
  ListingPreview,
  ListingStatus,
  SellerProfile,
  ServiceResult,
} from '../types/app'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type ListingRow = Tables<'listings'>
type SellerRow = Tables<'users'>
const PAGE_SIZE = 12

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

function mapSeller(row: SellerRow | null): SellerProfile | null {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    fullName: row.full_name,
    city: row.city,
    avatarUrl: row.avatar_url,
    phone: row.phone,
  }
}

function mapListingDetail(
  row: ListingRow,
  seller: SellerRow | null,
): ListingDetail {
  return {
    id: row.id,
    sellerId: row.seller_id,
    title: row.title,
    wasteType: row.waste_type,
    description: row.description,
    quantity: row.quantity,
    unit: row.unit,
    price: row.price,
    acceptOffers: row.accept_offers,
    imageUrl: row.image_url,
    address: row.address,
    city: row.city ?? seller?.city ?? 'Unknown location',
    latitude: row.latitude,
    longitude: row.longitude,
    fulfillmentType: row.fulfillment_type,
    status: row.status,
    createdAt: row.created_at ?? new Date().toISOString(),
    seller: mapSeller(seller),
  }
}

export async function getListings(
  page: number,
  filters: ListingFilters = {},
): Promise<ServiceResult<{ items: ListingPreview[]; hasMore: boolean }>> {
  if (!hasSupabaseEnv) {
    return { data: { items: [], hasMore: false }, error: null }
  }

  let query = getSupabaseClient()
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  if (filters.wasteType) {
    query = query.eq('waste_type', filters.wasteType)
  }

  if (filters.fulfillmentType) {
    query = query.eq('fulfillment_type', filters.fulfillmentType)
  }

  if (filters.minPrice != null) {
    query = query.gte('price', filters.minPrice)
  }

  if (filters.maxPrice != null) {
    query = query.lte('price', filters.maxPrice)
  }

  if (filters.search?.trim()) {
    const term = filters.search.trim()
    query = query.or(
      `title.ilike.%${term}%,city.ilike.%${term}%,waste_type.ilike.%${term}%`,
    )
  }

  const { data, error } = await query

  return {
    data: {
      items: data?.map(mapListing) ?? [],
      hasMore: (data?.length ?? 0) === PAGE_SIZE,
    },
    error,
  }
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
): Promise<ServiceResult<ListingDetail>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const { data, error } = await getSupabaseClient()
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .single()

  if (error || !data) {
    return { data: null, error }
  }

  const { data: seller } = await getSupabaseClient()
    .from('users')
    .select('id, full_name, city, avatar_url, phone')
    .eq('id', data.seller_id)
    .maybeSingle()

  return { data: mapListingDetail(data, seller), error: null }
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

export async function deleteListing(
  listingId: string,
): Promise<ServiceResult<ListingRow>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const { data, error } = await getSupabaseClient()
    .from('listings')
    .delete()
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
