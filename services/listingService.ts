import type {
  ListingActivityItem,
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
import { WASTE_TYPES } from '../utils/wasteTypes'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type ListingRow = Tables<'listings'>
type SellerRow = Tables<'users'>
const PAGE_SIZE = 12
const SEARCH_PAGE_MULTIPLIER = 4
const SEARCH_RESULT_LIMIT_CAP = 96
const DUPLICATE_LISTING_ERROR_MESSAGE =
  'You already have an active listing with the same details. Edit the existing listing instead of publishing it again.'
const SEARCH_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'around',
  'for',
  'from',
  'in',
  'is',
  'looking',
  'me',
  'my',
  'near',
  'of',
  'on',
  'or',
  'please',
  'show',
  'the',
  'to',
  'want',
  'with',
])
const WASTE_TYPE_SEARCH_ALIASES: Record<string, string[]> = {
  coconut_husk: [
    'coconut husk',
    'coco husk',
    'coir',
    'coco coir',
    'coco fiber',
    'coconut fiber',
    'coco fibre',
    'coconut fibre',
    'bunot',
  ],
  rice_straw: [
    'rice straw',
    'straw',
    'dayami',
    'palay straw',
    'rice hay',
    'rice stalk',
    'rice stalks',
    'palay residue',
  ],
  corn_stalks: [
    'corn stalks',
    'corn stalk',
    'maize stalk',
    'maize stalks',
    'corn stover',
    'corn residue',
    'maize residue',
    'mais stalk',
    'tangkay ng mais',
  ],
  banana_trunk: [
    'banana trunk',
    'banana stem',
    'banana pseudostem',
    'pseudostem',
    'banana stalk',
    'banana core',
    'saging trunk',
    'saging stem',
  ],
  sugarcane_bagasse: [
    'sugarcane bagasse',
    'bagasse',
    'sugar cane bagasse',
    'sugarcane fiber',
    'sugarcane fibre',
    'tubo',
    'tubo residue',
  ],
  pineapple_leaves: [
    'pineapple leaves',
    'pineapple leaf',
    'pina leaves',
    'pina leaf',
    'pina fiber',
    'pineapple fiber',
    'pineapple fibre',
    'dahon ng pinya',
  ],
  cassava_peel: [
    'cassava peel',
    'cassava peels',
    'tapioca peel',
    'tapioca peels',
    'kamoteng kahoy peel',
    'kamoteng kahoy peels',
    'balat ng cassava',
    'cassava skin',
  ],
  other: ['other'],
}

function hasText(value?: string | null) {
  return Boolean(value?.trim())
}

function normalizeListingText(value?: string | null) {
  return value?.trim().replace(/\s+/g, ' ').toLowerCase() ?? ''
}

function normalizeSearchTerm(value?: string | null) {
  return normalizeListingText(value).replace(/[^\p{L}\p{N}\s-]+/gu, ' ').replace(/\s+/g, ' ').trim()
}

function getSearchTokens(value?: string | null) {
  return Array.from(
    new Set(
      normalizeSearchTerm(value)
        .split(/[\s-]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !SEARCH_STOP_WORDS.has(token)),
    ),
  )
}

function getWasteTypeAliases(wasteType?: string | null) {
  if (!wasteType) {
    return []
  }

  return WASTE_TYPE_SEARCH_ALIASES[wasteType] ?? []
}

function detectWasteTypeFromSearch(search?: string | null) {
  const normalizedSearch = normalizeSearchTerm(search)

  if (!normalizedSearch) {
    return null
  }

  return (
    Object.entries(WASTE_TYPE_SEARCH_ALIASES).find(([, aliases]) =>
      aliases.some((alias) => normalizedSearch.includes(alias)),
    )?.[0] ??
    WASTE_TYPES.find((item) =>
      normalizedSearch.includes(item.label.toLowerCase()),
    )?.value ??
    null
  )
}

function buildSearchTerms(search?: string | null, wasteType?: string | null) {
  const normalizedSearch = normalizeSearchTerm(search)
  const detectedWasteType = wasteType ?? detectWasteTypeFromSearch(normalizedSearch)
  const labelAlias = detectedWasteType
    ? WASTE_TYPES.find((item) => item.value === detectedWasteType)?.label.toLowerCase() ?? null
    : null

  return Array.from(
    new Set(
      [
        normalizedSearch,
        ...getSearchTokens(normalizedSearch),
        ...getWasteTypeAliases(detectedWasteType),
        labelAlias,
      ].filter((value): value is string => Boolean(value && value.trim())),
    ),
  ).slice(0, 10)
}

function buildSearchClause(search?: string | null, wasteType?: string | null) {
  const terms = buildSearchTerms(search, wasteType)

  if (terms.length === 0) {
    return null
  }

  return terms
    .flatMap((term) => [
      `title.ilike.%${term}%`,
      `description.ilike.%${term}%`,
      `city.ilike.%${term}%`,
      `address.ilike.%${term}%`,
      `waste_type.ilike.%${term}%`,
      `fulfillment_type.ilike.%${term}%`,
      `unit.ilike.%${term}%`,
    ])
    .join(',')
}

function getSearchCandidateLimit(page: number) {
  return Math.min(
    Math.max((page + 1) * PAGE_SIZE * SEARCH_PAGE_MULTIPLIER, PAGE_SIZE * SEARCH_PAGE_MULTIPLIER),
    SEARCH_RESULT_LIMIT_CAP,
  )
}

function getListingSearchScore(listing: ListingRow, filters: ListingFilters = {}) {
  const normalizedSearch = normalizeSearchTerm(filters.search)
  const searchTokens = getSearchTokens(normalizedSearch)
  const effectiveWasteType = filters.wasteType ?? detectWasteTypeFromSearch(normalizedSearch)
  const titleText = normalizeListingText(listing.title)
  const cityText = normalizeListingText(listing.city)
  const addressText = normalizeListingText(listing.address)
  const descriptionText = normalizeListingText(listing.description)
  const wasteTypeText = normalizeListingText(listing.waste_type)
  const fulfillmentText = normalizeListingText(listing.fulfillment_type)
  const combinedText = [
    titleText,
    cityText,
    addressText,
    descriptionText,
    wasteTypeText,
    fulfillmentText,
  ]
    .filter(Boolean)
    .join(' ')

  let score = 0

  if (filters.wasteType && listing.waste_type === filters.wasteType) {
    score += 120
  } else if (effectiveWasteType && listing.waste_type === effectiveWasteType) {
    score += 90
  }

  if (filters.fulfillmentType && listing.fulfillment_type === filters.fulfillmentType) {
    score += 30
  }

  if (normalizedSearch) {
    if (titleText.includes(normalizedSearch)) {
      score += 75
    }

    if (cityText.includes(normalizedSearch) || addressText.includes(normalizedSearch)) {
      score += 55
    }

    if (descriptionText.includes(normalizedSearch)) {
      score += 35
    }

    if (wasteTypeText.includes(normalizedSearch)) {
      score += 65
    }
  }

  for (const token of searchTokens) {
    if (titleText.includes(token)) {
      score += 18
    }

    if (cityText.includes(token) || addressText.includes(token)) {
      score += 14
    }

    if (wasteTypeText.includes(token)) {
      score += 18
    }

    if (fulfillmentText.includes(token)) {
      score += 12
    }

    if (descriptionText.includes(token)) {
      score += 8
    }
  }

  if (!normalizedSearch) {
    score += 10
  } else if (combinedText.includes(normalizedSearch)) {
    score += 12
  }

  return score
}

function matchesOptionalText(
  left?: string | null,
  right?: string | null,
) {
  return normalizeListingText(left) === normalizeListingText(right)
}

function isDuplicateActiveListing(
  listing: TablesInsert<'listings'>,
  existing: ListingRow,
) {
  return (
    normalizeListingText(existing.title) === normalizeListingText(listing.title) &&
    existing.waste_type === listing.waste_type &&
    Number(existing.price) === Number(listing.price) &&
    Number(existing.quantity) === Number(listing.quantity) &&
    existing.unit === listing.unit &&
    existing.fulfillment_type === (listing.fulfillment_type ?? 'pickup') &&
    existing.accept_offers === (listing.accept_offers ?? false) &&
    matchesOptionalText(existing.city, listing.city) &&
    matchesOptionalText(existing.address, listing.address)
  )
}

async function findDuplicateActiveListing(
  listing: TablesInsert<'listings'>,
): Promise<ServiceResult<ListingRow>> {
  const { data, error } = await getSupabaseClient()
    .from('listings')
    .select('*')
    .eq('seller_id', listing.seller_id)
    .eq('status', 'active')
    .eq('waste_type', listing.waste_type)
    .eq('unit', listing.unit)
    .eq('price', listing.price)
    .eq('quantity', listing.quantity)
    .eq('fulfillment_type', listing.fulfillment_type ?? 'pickup')
    .eq('accept_offers', listing.accept_offers ?? false)

  if (error) {
    return { data: null, error }
  }

  const duplicate =
    data?.find((existing) => isDuplicateActiveListing(listing, existing)) ?? null

  return { data: duplicate, error: null }
}

function mapCreateListingError(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code ?? '')

    if (code === '23505') {
      return new Error(DUPLICATE_LISTING_ERROR_MESSAGE)
    }
  }

  return error instanceof Error
    ? error
    : new Error('We could not publish this listing right now.')
}

function mapDeleteListingError(error: unknown) {
  if (error instanceof Error) {
    return error
  }

  return new Error('We could not delete this listing from the database right now.')
}

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
    profileCompletionPercent: Math.round(
      ([hasText(row.full_name), hasText(row.avatar_url), hasText(row.phone), hasText(row.city)]
        .filter(Boolean).length /
        4) *
        100,
    ),
    isProfileComplete: [row.full_name, row.avatar_url, row.phone, row.city].every((value) =>
      hasText(value),
    ),
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
    const searchClause = buildSearchClause(filters.search, filters.wasteType)

    if (searchClause) {
      query = query.or(searchClause)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(getSearchCandidateLimit(page))

    if (error) {
      return { data: null, error }
    }

    const rankedRows = [...(data ?? [])].sort((left, right) => {
      const scoreDifference =
        getListingSearchScore(right, filters) - getListingSearchScore(left, filters)

      if (scoreDifference !== 0) {
        return scoreDifference
      }

      return (
        new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime()
      )
    })
    const startIndex = page * PAGE_SIZE
    const endIndex = startIndex + PAGE_SIZE

    return {
      data: {
        items: rankedRows.slice(startIndex, endIndex).map(mapListing),
        hasMore: rankedRows.length > endIndex,
      },
      error: null,
    }
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

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

export async function getSellerListingActivity(
  sellerId: string,
): Promise<ServiceResult<ListingActivityItem[]>> {
  if (!hasSupabaseEnv) {
    return { data: [], error: null }
  }

  const { data: listings, error: listingsError } = await getSupabaseClient()
    .from('listings')
    .select('id, title, created_at')
    .eq('seller_id', sellerId)

  if (listingsError) {
    return { data: [], error: listingsError }
  }

  const listingIds = (listings ?? []).map((listing) => listing.id)

  if (listingIds.length === 0) {
    return { data: [], error: null }
  }

  const [viewEvents, inquiryEvents] = await Promise.all([
    getSupabaseClient()
      .from('listing_engagement_events')
      .select('id, listing_id, buyer_id, created_at')
      .in('listing_id', listingIds)
      .eq('event_type', 'view')
      .order('created_at', { ascending: false }),
    getSupabaseClient()
      .from('contact_requests')
      .select('id, listing_id, buyer_id, created_at, status')
      .in('listing_id', listingIds)
      .order('created_at', { ascending: false }),
  ])

  if (viewEvents.error) {
    return { data: [], error: viewEvents.error }
  }

  if (inquiryEvents.error) {
    return { data: [], error: inquiryEvents.error }
  }

  const buyerIds = [
    ...(viewEvents.data ?? []).map((event) => event.buyer_id),
    ...(inquiryEvents.data ?? []).map((event) => event.buyer_id),
  ]

  const uniqueBuyerIds = [...new Set(buyerIds)]
  const { data: buyers, error: buyersError } = uniqueBuyerIds.length
    ? await getSupabaseClient()
        .from('users')
        .select('id, full_name')
        .in('id', uniqueBuyerIds)
    : { data: [], error: null }

  if (buyersError) {
    return { data: [], error: buyersError }
  }

  const listingTitleById = new Map(
    (listings ?? []).map((listing) => [listing.id, listing.title]),
  )
  const buyerNameById = new Map(
    (buyers ?? []).map((buyer) => [buyer.id, buyer.full_name]),
  )

  const activity: ListingActivityItem[] = [
    ...(listings ?? []).map((listing) => ({
      id: `created-${listing.id}`,
      listingId: listing.id,
      type: 'listing_created' as const,
      createdAt: listing.created_at ?? new Date().toISOString(),
      title: 'Listing published',
      description: `${listing.title} is now visible to buyers.`,
    })),
    ...((viewEvents.data ?? []).map((event) => ({
      id: `view-${event.id}`,
      listingId: event.listing_id,
      type: 'listing_viewed' as const,
      createdAt: event.created_at,
      title: 'Listing viewed',
      description: `${
        buyerNameById.get(event.buyer_id) ?? 'A buyer'
      } opened this listing.`,
    })) satisfies ListingActivityItem[]),
    ...((inquiryEvents.data ?? []).map((event) => ({
      id: `inquiry-${event.id}`,
      listingId: event.listing_id,
      type: 'inquiry_received' as const,
      createdAt: event.created_at,
      title: 'Inquiry received',
      description: `${
        buyerNameById.get(event.buyer_id) ?? 'A buyer'
      } sent an inquiry for ${listingTitleById.get(event.listing_id) ?? 'this listing'}.`,
    })) satisfies ListingActivityItem[]),
  ]

  return {
    data: activity.sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
    error: null,
  }
}

export async function createListing(
  listing: TablesInsert<'listings'>,
): Promise<ServiceResult<ListingRow>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  if ((listing.status ?? 'active') === 'active') {
    const duplicateResult = await findDuplicateActiveListing(listing)

    if (duplicateResult.error) {
      return { data: null, error: duplicateResult.error }
    }

    if (duplicateResult.data) {
      return {
        data: null,
        error: new Error(DUPLICATE_LISTING_ERROR_MESSAGE),
      }
    }
  }

  const { data, error } = await getSupabaseClient()
    .from('listings')
    .insert(listing)
    .select()
    .single()

  if (error) {
    return { data: null, error: mapCreateListingError(error) }
  }

  return { data, error: null }
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
    .maybeSingle()

  if (error) {
    return { data: null, error: mapDeleteListingError(error) }
  }

  if (!data) {
    return {
      data: null,
      error: new Error('This listing was not deleted from the database. Try again.'),
    }
  }

  const verification = await getSupabaseClient()
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('id', listingId)

  if (verification.error) {
    return {
      data: null,
      error: new Error(
        'The listing was removed, but database verification failed. Refresh your listings to confirm.',
      ),
    }
  }

  if ((verification.count ?? 0) > 0) {
    return {
      data: null,
      error: new Error('The listing still exists in the database after delete.'),
    }
  }

  return { data, error: null }
}

export async function setListingStatus(
  listingId: string,
  status: ListingStatus,
) {
  return updateListing(listingId, { status })
}

export async function setListingsStatus(
  listingIds: string[],
  status: ListingStatus,
): Promise<ServiceResult<ListingRow[]>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  if (listingIds.length === 0) {
    return { data: [], error: null }
  }

  const { data, error } = await getSupabaseClient()
    .from('listings')
    .update({ status })
    .in('id', listingIds)
    .select()

  return { data: data ?? [], error }
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
