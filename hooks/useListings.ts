import { useCallback, useEffect, useState } from 'react'

import type { ListingFilters, ListingPreview } from '../types/app'

import { useAsync } from './useAsync'

import { getFarmerListings, getListings } from '../services/listingService'

export function useBuyerListings(filters: ListingFilters = {}) {
  const [listings, setListings] = useState<ListingPreview[]>([])
  const [page, setPage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadFirstPage = async () => {
      setIsLoading(true)
      setError(null)

      const result = await getListings(0, filters)

      if (!isMounted) {
        return
      }

      if (result.error) {
        setError(result.error)
        setListings([])
        setHasMore(false)
        setIsLoading(false)
        return
      }

      setListings(result.data?.items ?? [])
      setHasMore(result.data?.hasMore ?? false)
      setPage(0)
      setIsLoading(false)
    }

    void loadFirstPage()

    return () => {
      isMounted = false
    }
  }, [
    filters.fulfillmentType,
    filters.maxPrice,
    filters.minPrice,
    filters.search,
    filters.wasteType,
  ])

  const loadMore = async () => {
    if (isLoading || isFetchingMore || !hasMore) {
      return
    }

    const nextPage = page + 1
    setIsFetchingMore(true)

    const result = await getListings(nextPage, filters)

    if (result.error) {
      setError(result.error)
      setIsFetchingMore(false)
      return
    }

    setListings((current) => [...current, ...(result.data?.items ?? [])])
    setHasMore(result.data?.hasMore ?? false)
    setPage(nextPage)
    setIsFetchingMore(false)
  }

  return {
    data: listings,
    isLoading,
    isFetchingMore,
    hasMore,
    error,
    loadMore,
  }
}

export function useFarmerListings(userId?: string | null) {
  const loadFarmerListings = useCallback(async () => {
    if (!userId) {
      return []
    }

    const result = await getFarmerListings(userId)

    if (result.error) {
      throw result.error
    }

    return result.data ?? []
  }, [userId])

  return useAsync<ListingPreview[]>(
    loadFarmerListings,
    [userId],
    Boolean(userId),
  )
}
