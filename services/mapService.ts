import type { Tables } from '../types/database'

import { getListingById, getListingPins } from './listingService'

export async function fetchListingPins() {
  return getListingPins()
}

export async function fetchPinDetails(id: string) {
  return getListingById(id) as Promise<{
    data: Tables<'listings'> | null
    error: Error | null
  }>
}
