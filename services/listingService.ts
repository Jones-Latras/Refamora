import type {
  ListingDetail,
  ListingFilters,
  ListingPerformanceSummary,
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
    latitude: row.latitude,
    longitude: row.longitude,
    imageUrl: row.image_url,
    status: row.status,
    sellerName: null,
    fulfillmentType: row.fulfillment_type,
    createdAt: row.created_at ?? new Date().toISOString(),
  }
}

function mapSeller(
  row: SellerRow | null,
  stats?: {
    listingCount?: number | null
    respondedInquiryCount?: number | null
  },
): SellerProfile | null {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    fullName: row.full_name,
    city: row.city,
    avatarUrl: row.avatar_url,
    phone: row.phone,
    listingCount: stats?.listingCount ?? null,
    respondedInquiryCount: stats?.respondedInquiryCount ?? null,
  }
}

function mapListingDetail(
  row: ListingRow,
  seller: SellerProfile | null,
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
    seller,
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

export async function getListingPreviewsByIds(
  listingIds: string[],
): Promise<ServiceResult<ListingPreview[]>> {
  if (!hasSupabaseEnv || listingIds.length === 0) {
    return { data: [], error: null }
  }

  const { data, error } = await getSupabaseClient()
    .from('listings')
    .select('*')
    .in('id', listingIds)

  if (error) {
    return { data: [], error }
  }

  const previewsById = new Map(
    (data ?? []).map((row) => [row.id, mapListing(row)]),
  )

  return {
    data: listingIds
      .map((listingId) => previewsById.get(listingId))
      .filter((item): item is ListingPreview => Boolean(item)),
    error: null,
  }
}

export async function getRelatedListings(input: {
  listingId: string
  wasteType: string
  city?: string | null
}): Promise<ServiceResult<ListingPreview[]>> {
  if (!hasSupabaseEnv) {
    return { data: [], error: null }
  }

  let query = getSupabaseClient()
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .eq('waste_type', input.wasteType)
    .neq('id', input.listingId)
    .order('created_at', { ascending: false })
    .limit(4)

  if (input.city?.trim()) {
    query = query.eq('city', input.city.trim())
  }

  const { data, error } = await query

  if (error) {
    return { data: [], error }
  }

  if ((data?.length ?? 0) > 0 || !input.city?.trim()) {
    return { data: data?.map(mapListing) ?? [], error: null }
  }

  const fallback = await getSupabaseClient()
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .eq('waste_type', input.wasteType)
    .neq('id', input.listingId)
    .order('created_at', { ascending: false })
    .limit(4)

  return {
    data: fallback.data?.map(mapListing) ?? [],
    error: fallback.error,
  }
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

  const [{ count: listingCount }, { count: respondedInquiryCount }] = await Promise.all([
    getSupabaseClient()
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', data.seller_id),
    getSupabaseClient()
      .from('contact_requests')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', data.seller_id)
      .eq('status', 'responded'),
  ])

  const sellerProfile = mapSeller(seller, {
    listingCount: listingCount ?? 0,
    respondedInquiryCount: respondedInquiryCount ?? 0,
  })

  return { data: mapListingDetail(data, sellerProfile), error: null }
}

export async function recordListingView(input: {
  listingId: string
  buyerId: string
}): Promise<ServiceResult<Tables<'listing_engagement_events'>>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const { data, error } = await getSupabaseClient()
    .from('listing_engagement_events')
    .insert({
      listing_id: input.listingId,
      buyer_id: input.buyerId,
      event_type: 'view',
    })
    .select()
    .single()

  return { data, error }
}

export async function getSellerListingPerformance(
  sellerId: string,
): Promise<ServiceResult<ListingPerformanceSummary[]>> {
  if (!hasSupabaseEnv) {
    return { data: [], error: null }
  }

  const { data: listings, error: listingsError } = await getSupabaseClient()
    .from('listings')
    .select('id')
    .eq('seller_id', sellerId)

  if (listingsError) {
    return { data: [], error: listingsError }
  }

  const listingIds = (listings ?? []).map((listing) => listing.id)

  if (listingIds.length === 0) {
    return { data: [], error: null }
  }

  const [viewsResult, inquiriesResult] = await Promise.all([
    getSupabaseClient()
      .from('listing_engagement_events')
      .select('listing_id, created_at, event_type')
      .in('listing_id', listingIds)
      .eq('event_type', 'view'),
    getSupabaseClient()
      .from('contact_requests')
      .select('listing_id, status, created_at')
      .in('listing_id', listingIds),
  ])

  if (viewsResult.error) {
    return { data: [], error: viewsResult.error }
  }

  if (inquiriesResult.error) {
    return { data: [], error: inquiriesResult.error }
  }

  const performanceByListing = new Map<string, ListingPerformanceSummary>(
    listingIds.map((listingId) => [
      listingId,
      {
        listingId,
        viewCount: 0,
        inquiryCount: 0,
        pendingInquiryCount: 0,
        respondedInquiryCount: 0,
        lastInquiryAt: null,
      },
    ]),
  )

  for (const event of viewsResult.data ?? []) {
    const current = performanceByListing.get(event.listing_id)

    if (!current) {
      continue
    }

    current.viewCount += 1
  }

  for (const inquiry of inquiriesResult.data ?? []) {
    const current = performanceByListing.get(inquiry.listing_id)

    if (!current) {
      continue
    }

    current.inquiryCount += 1

    if (inquiry.status === 'pending') {
      current.pendingInquiryCount += 1
    }

    if (inquiry.status === 'responded') {
      current.respondedInquiryCount += 1
    }

    if (
      !current.lastInquiryAt ||
      new Date(inquiry.created_at).getTime() > new Date(current.lastInquiryAt).getTime()
    ) {
      current.lastInquiryAt = inquiry.created_at
    }
  }

  return {
    data: listingIds
      .map((listingId) => performanceByListing.get(listingId))
      .filter((item): item is ListingPerformanceSummary => Boolean(item)),
    error: null,
  }
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
