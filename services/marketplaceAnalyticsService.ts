import type { MarketplaceAnalyticsSummary, ServiceResult } from '../types/app'
import type { Tables } from '../types/database'
import { calculateRate, rankOccurrences } from '../utils/marketplaceAnalytics'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type UserRow = Tables<'users'>
type ListingRow = Tables<'listings'>
type ContactRequestRow = Tables<'contact_requests'>
type ListingEngagementEventRow = Tables<'listing_engagement_events'>

export async function getMarketplaceAnalyticsSummary(
  periodDays = 7,
): Promise<ServiceResult<MarketplaceAnalyticsSummary>> {
  if (!hasSupabaseEnv) {
    return {
      data: {
        periodDays,
        totalUsers: 0,
        totalFarmers: 0,
        totalBuyers: 0,
        verifiedSellerCount: 0,
        activeListings: 0,
        soldListings: 0,
        unavailableListings: 0,
        totalListingViews: 0,
        totalInquiries: 0,
        respondedInquiries: 0,
        recentSignUps: 0,
        recentListings: 0,
        recentInquiries: 0,
        inquiryConversionRate: null,
        sellerResponseRate: null,
        topWasteTypes: [],
        topCities: [],
      },
      error: null,
    }
  }

  const windowStart = new Date(
    Date.now() - periodDays * 24 * 60 * 60 * 1000,
  ).toISOString()

  const [usersResult, listingsResult, inquiriesResult, viewsResult] = await Promise.all([
    getSupabaseClient().from('users').select('id, role, is_verified, created_at'),
    getSupabaseClient()
      .from('listings')
      .select('id, status, waste_type, city, created_at'),
    getSupabaseClient()
      .from('contact_requests')
      .select('id, status, created_at'),
    getSupabaseClient()
      .from('listing_engagement_events')
      .select('id, event_type, created_at'),
  ])

  if (usersResult.error) {
    return { data: null, error: usersResult.error }
  }

  if (listingsResult.error) {
    return { data: null, error: listingsResult.error }
  }

  if (inquiriesResult.error) {
    return { data: null, error: inquiriesResult.error }
  }

  if (viewsResult.error) {
    return { data: null, error: viewsResult.error }
  }

  const users = (usersResult.data ?? []) as Pick<
    UserRow,
    'id' | 'role' | 'is_verified' | 'created_at'
  >[]
  const listings = (listingsResult.data ?? []) as Pick<
    ListingRow,
    'id' | 'status' | 'waste_type' | 'city' | 'created_at'
  >[]
  const inquiries = (inquiriesResult.data ?? []) as Pick<
    ContactRequestRow,
    'id' | 'status' | 'created_at'
  >[]
  const views = (viewsResult.data ?? []) as Pick<
    ListingEngagementEventRow,
    'id' | 'event_type' | 'created_at'
  >[]

  const totalFarmers = users.filter((user) => user.role === 'farmer').length
  const totalBuyers = users.filter((user) => user.role === 'buyer').length
  const verifiedSellerCount = users.filter(
    (user) => user.role === 'farmer' && user.is_verified,
  ).length

  const activeListings = listings.filter((listing) => listing.status === 'active')
  const soldListings = listings.filter((listing) => listing.status === 'sold').length
  const unavailableListings = listings.filter(
    (listing) => listing.status === 'unavailable',
  ).length
  const respondedInquiries = inquiries.filter(
    (inquiry) => inquiry.status === 'responded',
  ).length

  return {
    data: {
      periodDays,
      totalUsers: users.length,
      totalFarmers,
      totalBuyers,
      verifiedSellerCount,
      activeListings: activeListings.length,
      soldListings,
      unavailableListings,
      totalListingViews: views.length,
      totalInquiries: inquiries.length,
      respondedInquiries,
      recentSignUps: users.filter((user) => user.created_at >= windowStart).length,
      recentListings: listings.filter((listing) => listing.created_at >= windowStart).length,
      recentInquiries: inquiries.filter((inquiry) => inquiry.created_at >= windowStart).length,
      inquiryConversionRate: calculateRate(inquiries.length, views.length),
      sellerResponseRate: calculateRate(respondedInquiries, inquiries.length),
      topWasteTypes: rankOccurrences(activeListings.map((listing) => listing.waste_type)),
      topCities: rankOccurrences(activeListings.map((listing) => listing.city)),
    },
    error: null,
  }
}
