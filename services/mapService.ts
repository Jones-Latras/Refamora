import type { ListingDetail } from '../types/app'

import { getListingById, getListingPins } from './listingService'

export async function fetchListingPins() {
  return getListingPins()
}

export async function fetchPinDetails(id: string) {
  return getListingById(id) as Promise<{
    data: ListingDetail | null
    error: Error | null
  }>
}
