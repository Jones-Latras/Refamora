import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { ListingFilters, ListingPreview } from '../types/app'

import { useAsync } from './useAsync'

import { getFarmerListings, getListings } from '../services/listingService'

export function useBuyerListings(filters: ListingFilters = {}, enabled = true) {
  const [listings, setListings] = useState<ListingPreview[]>([])
  const [page, setPage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  const previousRequestKeyRef = useRef<string | null>(null)
  const previousReloadNonceRef = useRef<number | null>(null)
  const requestFilters = useMemo(
    () => ({
      fulfillmentType: filters.fulfillmentType,
      maxPrice: filters.maxPrice,
      minPrice: filters.minPrice,
      search: filters.search,
      wasteType: filters.wasteType,
    }),
    [
      filters.fulfillmentType,
      filters.maxPrice,
      filters.minPrice,
      filters.search,
      filters.wasteType,
    ],
  )
  const requestKey = useMemo(() => JSON.stringify(requestFilters), [requestFilters])

  useEffect(() => {
    if (!enabled) {
      return
    }

    let isMounted = true
    const isManualRetry =
      previousRequestKeyRef.current === requestKey &&
      previousReloadNonceRef.current != null &&
      previousReloadNonceRef.current !== reloadNonce

    const loadFirstPage = async () => {
      setIsLoading(true)
      setError(null)

      const result = await getListings(0, requestFilters)

      if (!isMounted) {
        return
      }

      if (result.error) {
        setError(result.error)
        if (!isManualRetry) {
          setListings([])
          setHasMore(false)
        }
        setIsLoading(false)
        return
      }

      setListings(result.data?.items ?? [])
      setHasMore(result.data?.hasMore ?? false)
      setPage(0)
      setIsLoading(false)
    }

    void loadFirstPage()

    previousRequestKeyRef.current = requestKey
    previousReloadNonceRef.current = reloadNonce

    return () => {
      isMounted = false
    }
  }, [enabled, reloadNonce, requestFilters, requestKey])

  const loadMore = async () => {
    if (!enabled || isLoading || isFetchingMore || !hasMore) {
      return
    }

    const nextPage = page + 1
    setIsFetchingMore(true)

    const result = await getListings(nextPage, requestFilters)

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
    isLoading: enabled ? isLoading : true,
    isFetchingMore,
    hasMore,
    error,
    loadMore,
    retry: () => setReloadNonce((current) => current + 1),
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
