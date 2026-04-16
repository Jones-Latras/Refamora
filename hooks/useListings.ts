import type { ListingPreview } from '../types/app'

import { useAsync } from './useAsync'

import { getBuyerFeed, getFarmerListings } from '../services/listingService'

export function useBuyerListings() {
  return useAsync<ListingPreview[]>(async () => {
    const result = await getBuyerFeed()

    if (result.error) {
      throw result.error
    }

    return result.data ?? []
  })
}

export function useFarmerListings(userId?: string | null) {
  return useAsync<ListingPreview[]>(
    async () => {
      if (!userId) {
        return []
      }

      const result = await getFarmerListings(userId)

      if (result.error) {
        throw result.error
      }

      return result.data ?? []
    },
    [userId],
    Boolean(userId),
  )
}
