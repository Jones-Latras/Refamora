import { useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { FeedFilterSheet } from '../../components/FeedFilterSheet'
import { ListingCard } from '../../components/ListingCard'
import { SkeletonCard } from '../../components/SkeletonCard'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { useBuyerLocationStore } from '../../hooks/useBuyerLocation'
import { useDebounce } from '../../hooks/useDebounce'
import { useBuyerListings } from '../../hooks/useListings'
import { useBuyerFeedStore } from '../../hooks/useBuyerFeedState'
import { useConnectivity } from '../../hooks/useConnectivity'
import { useProfile } from '../../hooks/useProfile'
import { useRecentlyViewedStore } from '../../hooks/useRecentlyViewed'
import { getBuyerSearchAssist } from '../../services/aiService'
import { getListingPreviewsByIds } from '../../services/listingService'
import { requestCurrentCoordinates } from '../../services/locationService'
import type { BuyerSearchAssistResult } from '../../types/app'
import { formatDistanceAway, getDistanceKm } from '../../utils/location'
import { palette, radii } from '../../utils/theme'
import { WASTE_TYPES } from '../../utils/wasteTypes'

function getInitials(name?: string | null, fallback = 'B') {
  if (!name) {
    return fallback.charAt(0).toUpperCase()
  }

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function formatAiSearchLabels(result: BuyerSearchAssistResult | null) {
  if (!result) {
    return []
  }

  const labels: string[] = []
  const wasteTypeLabel = WASTE_TYPES.find(
    (item) => item.value === result.result.wasteType,
  )?.label

  if (wasteTypeLabel) {
    labels.push(wasteTypeLabel)
  }

  if (result.result.fulfillmentType) {
    labels.push(result.result.fulfillmentType)
  }

  if (result.result.minPrice != null || result.result.maxPrice != null) {
    labels.push(
      `PHP ${result.result.minPrice ?? 0} - ${result.result.maxPrice ?? 'up'}`,
    )
  }

  if (result.result.search) {
    labels.push(result.result.search)
  }

  return labels
}

function RecentListingChip({
  title,
  city,
  imageUrl,
  onPress,
}: {
  title: string
  city: string
  imageUrl: string | null
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} style={styles.recentCard}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.recentImage} />
      ) : (
        <View style={styles.recentImageFallback}>
          <Text style={styles.recentImageFallbackText}>Viewed</Text>
        </View>
      )}
      <View style={styles.recentText}>
        <Text numberOfLines={1} style={styles.recentTitle}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.recentMeta}>
          {city}
        </Text>
      </View>
    </Pressable>
  )
}

export default function FeedScreen() {
  const { user } = useAuth()
  const { profile, refetch: refetchProfile } = useProfile(user?.id)
  const { isOffline } = useConnectivity()
  const { showToast } = useToast()
  const recentlyViewedIds = useRecentlyViewedStore((state) => state.listingIds)
  const buyerCoordinates = useBuyerLocationStore((state) => state.coordinates)
  const setBuyerCoordinates = useBuyerLocationStore((state) => state.setCoordinates)
  const clearBuyerCoordinates = useBuyerLocationStore((state) => state.clearCoordinates)
  const isFeedStateHydrated = useBuyerFeedStore((state) => state.hydrated)
  const query = useBuyerFeedStore((state) => state.query)
  const setQuery = useBuyerFeedStore((state) => state.setQuery)
  const filters = useBuyerFeedStore((state) => state.filters)
  const setFilters = useBuyerFeedStore((state) => state.setFilters)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isAiSearchLoading, setIsAiSearchLoading] = useState(false)
  const [isLocationLoading, setIsLocationLoading] = useState(false)
  const [isRecentExpanded, setIsRecentExpanded] = useState(false)
  const [aiSearchResult, setAiSearchResult] =
    useState<BuyerSearchAssistResult | null>(null)
  const [aiSearchSourceQuery, setAiSearchSourceQuery] = useState<string | null>(null)
  const [recentListings, setRecentListings] = useState<
    {
      id: string
      title: string
      city: string
      imageUrl: string | null
    }[]
  >([])
  const debouncedQuery = useDebounce(query)
  const { data, isLoading, isFetchingMore, loadMore, error, retry } = useBuyerListings(
    {
      ...filters,
      search: debouncedQuery.trim() || undefined,
    },
    isFeedStateHydrated,
  )

  const activeFilterCount = [
    filters.wasteType,
    filters.fulfillmentType,
    filters.minPrice,
    filters.maxPrice,
  ].filter((value) => value != null && value !== '').length
  const interpretedLabels = useMemo(
    () => formatAiSearchLabels(aiSearchResult),
    [aiSearchResult],
  )
  const listingsWithDistance = useMemo(
    () =>
      data
        .map((listing) => ({
          listing,
          distanceKm:
            buyerCoordinates &&
            listing.latitude != null &&
            listing.longitude != null
              ? getDistanceKm(buyerCoordinates, {
                  latitude: listing.latitude,
                  longitude: listing.longitude,
                })
              : null,
        }))
        .sort((left, right) => {
          if (left.distanceKm == null && right.distanceKm == null) {
            return 0
          }

          if (left.distanceKm == null) {
            return 1
          }

          if (right.distanceKm == null) {
            return -1
          }

          return left.distanceKm - right.distanceKm
        }),
    [buyerCoordinates, data],
  )
  const mappedDistanceCount = useMemo(
    () =>
      listingsWithDistance.filter((item) => item.distanceKm != null).length,
    [listingsWithDistance],
  )

  const handleQueryChange = (value: string) => {
    setQuery(value)

    if (aiSearchSourceQuery && value.trim() !== aiSearchSourceQuery.trim()) {
      setAiSearchResult(null)
      setAiSearchSourceQuery(null)
    }
  }

  const loadRecentListings = useCallback(async () => {
    if (recentlyViewedIds.length === 0) {
      setRecentListings([])
      return
    }

    const result = await getListingPreviewsByIds(recentlyViewedIds)

    if (result.error) {
      showToast(result.error.message, 'error')
      setRecentListings([])
      return
    }

    setRecentListings(
      (result.data ?? []).slice(0, 5).map((listing) => ({
        id: listing.id,
        title: listing.title,
        city: listing.city,
        imageUrl: listing.imageUrl,
      })),
    )
  }, [recentlyViewedIds, showToast])

  useFocusEffect(
    useCallback(() => {
      void refetchProfile().catch(() => undefined)
    }, [refetchProfile]),
  )

  useFocusEffect(
    useCallback(() => {
      void loadRecentListings()
    }, [loadRecentListings]),
  )

  const handleAiSearch = async () => {
    if (isOffline) {
      showToast(
        'Reconnect to use AI search. You can still browse listings that were already loaded.',
        'info',
      )
      return
    }

    const trimmedQuery = query.trim()

    if (trimmedQuery.length < 3) {
      showToast('Enter a more specific search request first.', 'error')
      return
    }

    setIsAiSearchLoading(true)

    try {
      const result = await getBuyerSearchAssist({
        query: trimmedQuery,
      })

      if (result.error || !result.data) {
        showToast(
          result.error?.message ??
            'AI search is unavailable right now. You can continue with normal search.',
          'error',
        )
        return
      }

      setAiSearchResult(result.data)
      setAiSearchSourceQuery(trimmedQuery)
      showToast('AI filters are ready to review.', 'success')
    } finally {
      setIsAiSearchLoading(false)
    }
  }

  const applyAiSearch = () => {
    if (!aiSearchResult) {
      return
    }

    setFilters({
      wasteType: aiSearchResult.result.wasteType ?? undefined,
      fulfillmentType: aiSearchResult.result.fulfillmentType ?? undefined,
      minPrice: aiSearchResult.result.minPrice ?? undefined,
      maxPrice: aiSearchResult.result.maxPrice ?? undefined,
    })
    setQuery(aiSearchResult.result.search ?? '')
    setAiSearchResult(null)
    setAiSearchSourceQuery(null)
    showToast('AI filters applied. You can still adjust them manually.', 'success')
  }

  const handleUseMyLocation = async () => {
    setIsLocationLoading(true)

    const result = await requestCurrentCoordinates()

    setIsLocationLoading(false)

    if (result.error || !result.data) {
      showToast(
        result.error?.message ?? 'Unable to get your current location right now.',
        'error',
      )
      return
    }

    setBuyerCoordinates(result.data)
    showToast('Your location is on. Nearby listings are shown first.', 'success')
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.headerShell}>
          <View style={styles.identityRow}>
            {profile?.avatar_url ? (
              <Pressable onPress={() => router.push('/(buyer)/profile')}>
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.push('/(buyer)/profile')}
                style={styles.avatarFallback}
              >
                <Text style={styles.avatarText}>
                  {getInitials(profile?.full_name, user?.email ?? 'B')}
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => router.push('/(buyer)/profile')}
              style={styles.identityText}
            >
              <Text style={styles.identityTitle}>{profile?.full_name ?? 'Buyer'}</Text>
              <Text style={styles.identityMeta}>
                {profile?.email ?? user?.email ?? 'No email'}
              </Text>
            </Pressable>

          </View>

          <View style={styles.searchShell}>
            <Feather name="search" size={16} color="#9e9183" />
            <TextInput
              value={query}
              onChangeText={handleQueryChange}
              placeholder="Try: cassava peel near Surigao under PHP 500"
              placeholderTextColor="#9e9183"
              style={styles.search}
            />
            <Pressable
              onPress={() => setIsFilterOpen(true)}
              style={styles.searchFilterButton}
            >
              <Feather name="sliders" size={14} color={palette.clay} style={{marginRight: 2}} />
              <Text style={styles.searchFilterButtonText}>
                {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
              </Text>
            </Pressable>
            {(query.trim().length > 0 ||
              activeFilterCount > 0 ||
              aiSearchResult != null ||
              buyerCoordinates != null) ? (
              <Pressable
                onPress={() => {
                  setQuery('')
                  setFilters({})
                  setAiSearchResult(null)
                  setAiSearchSourceQuery(null)
                  clearBuyerCoordinates()
                }}
                style={styles.searchClearButton}
              >
                <Feather name="x" size={16} color={palette.muted} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionRow}
          >
            <Pressable
              onPress={() => router.push('/(buyer)/dashboard')}
              style={[styles.activityShortcut, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
            >
              <Feather name="clock" size={14} color={palette.clay} />
              <Text style={styles.activityShortcutText}>
                View your recent activity
              </Text>
            </Pressable>
            <Pressable
              disabled={isOffline}
              onPress={() => void handleAiSearch()}
              style={[styles.aiSearchButton, isOffline ? styles.disabledButton : null, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
            >
              <Feather name="zap" size={14} color={palette.sageDark} />
              <Text style={styles.aiSearchButtonText}>
                {isOffline
                  ? 'AI search offline'
                  : isAiSearchLoading
                    ? 'Reading search...'
                    : 'Search with AI'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void handleUseMyLocation()}
              style={[
                styles.locationButton,
                buyerCoordinates ? styles.locationButtonActive : null,
                { flexDirection: 'row', alignItems: 'center', gap: 6 }
              ]}
            >
              <Feather name="map-pin" size={14} color={buyerCoordinates ? palette.sageDark : palette.clay} />
              <Text
                style={[
                  styles.locationButtonText,
                  buyerCoordinates ? styles.locationButtonTextActive : null,
                ]}
              >
                {isLocationLoading
                  ? 'Getting your location...'
                  : buyerCoordinates
                    ? 'Refresh my location'
                    : 'Use my location'}
              </Text>
            </Pressable>
          </ScrollView>

          <Text style={styles.searchHint}>
            Ask AI with a full request like rice straw for delivery in Surigao under PHP 500.
          </Text>

          <Text style={styles.locationHint}>
            {buyerCoordinates
              ? `Nearest listings are shown first for ${mappedDistanceCount} mapped result${
                  mappedDistanceCount === 1 ? '' : 's'
                }.`
              : 'Turn on location to see how far listings are from you.'}
          </Text>

          {aiSearchResult ? (
            <View style={styles.aiReviewCard}>
              <Text style={styles.aiReviewTitle}>AI interpreted your search</Text>
              {aiSearchSourceQuery ? (
                <Text style={styles.aiReviewSource}>For: {aiSearchSourceQuery}</Text>
              ) : null}
              <Text style={styles.aiReviewMeta}>
                Provider:{' '}
                {aiSearchResult.provider === 'local_gemma'
                  ? 'Local Gemma'
                  : 'Gemini'}
                {aiSearchResult.fallbackUsed ? ' | fallback used' : ''}
              </Text>
              {interpretedLabels.length > 0 ? (
                <View style={styles.aiReviewChipWrap}>
                  {interpretedLabels.map((label) => (
                    <View key={label} style={styles.aiReviewChip}>
                      <Text style={styles.aiReviewChipText}>{label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {aiSearchResult.result.notes.length > 0 ? (
                <View style={styles.aiReviewNotes}>
                  {aiSearchResult.result.notes.map((note) => (
                    <Text key={note} style={styles.aiReviewNote}>
                      - {note}
                    </Text>
                  ))}
                </View>
              ) : null}
              <View style={styles.aiReviewActions}>
                <Pressable onPress={applyAiSearch} style={styles.aiApplyButton}>
                  <Text style={styles.aiApplyButtonText}>Apply AI filters</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setAiSearchResult(null)
                    setAiSearchSourceQuery(null)
                  }}
                  style={styles.aiDismissButton}
                >
                  <Text style={styles.aiDismissButtonText}>Dismiss</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {recentListings.length > 0 ? (
            <View style={styles.recentSection}>
              <View style={styles.recentSectionHeader}>
                <View style={styles.recentSectionText}>
                  <Text style={styles.recentSectionTitle}>Recently viewed</Text>
                </View>
                <View style={styles.recentSectionActions}>
                  <Pressable
                    onPress={() => setIsRecentExpanded((current) => !current)}
                    style={styles.recentToggle}
                  >
                    <Text numberOfLines={1} style={styles.recentToggleText}>
                      {isRecentExpanded ? 'Hide' : 'Show'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => router.push('/(buyer)/dashboard')}>
                    <Text style={styles.recentSectionLink}>See all</Text>
                  </Pressable>
                </View>
              </View>

              {isRecentExpanded ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recentScroll}
                >
                  {recentListings.map((listing) => (
                    <RecentListingChip
                      key={listing.id}
                      title={listing.title}
                      city={listing.city}
                      imageUrl={listing.imageUrl}
                      onPress={() => router.push(`/(shared)/listing/${listing.id}`)}
                    />
                  ))}
                </ScrollView>
              ) : null}
            </View>
          ) : null}
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : error && listingsWithDistance.length === 0 ? (
          <ErrorState
            title="Feed could not be loaded"
            description="Refamora could not load the latest listings right now. Try again to refresh the marketplace feed."
            onAction={retry}
          />
        ) : listingsWithDistance.length > 0 ? (
          <FlatList
            data={listingsWithDistance}
            keyExtractor={(item) => item.listing.id}
            contentContainerStyle={styles.list}
            onEndReached={isOffline ? undefined : loadMore}
            onEndReachedThreshold={0.8}
            ListFooterComponent={
              isFetchingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator color={palette.sage} size="small" />
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <ListingCard
                listing={item.listing}
                distanceLabel={
                  item.distanceKm != null
                    ? formatDistanceAway(
                        item.distanceKm,
                        buyerCoordinates?.accuracyMeters,
                      )
                    : null
                }
                onPress={() => router.push(`/(shared)/listing/${item.listing.id}`)}
              />
            )}
          />
        ) : (
          <EmptyState
            title={isOffline ? 'Listings are unavailable offline' : 'No listings match your search'}
            description={
              isOffline
                ? 'Reconnect to refresh the feed, pull the latest listings, and run search again.'
                : 'Try widening your price range, changing the waste type, or clearing some filters to explore more available listings.'
            }
            actionLabel="Clear filters"
            onAction={() => {
              setFilters({})
              setQuery('')
              setAiSearchResult(null)
              setAiSearchSourceQuery(null)
            }}
          />
        )}
      </View>

      <FeedFilterSheet
        open={isFilterOpen}
        filters={filters}
        onClose={() => setIsFilterOpen(false)}
        onApply={setFilters}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  content: {
    flex: 1,
  },
  headerShell: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 10,
    backgroundColor: palette.cream,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#dfe6dd',
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: palette.cream,
    fontSize: 17,
    fontWeight: '800',
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  identityTitle: {
    color: palette.soil,
    fontSize: 18,
    fontWeight: '800',
  },
  identityMeta: {
    color: palette.muted,
    fontSize: 13,
  },
  searchShell: {
    backgroundColor: palette.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.border,
    paddingLeft: 14,
    paddingRight: 8,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  search: {
    flex: 1,
    fontSize: 14,
    color: palette.ink,
    paddingVertical: 11,
  },
  actionRow: {
    gap: 6,
    paddingRight: 24,
  },
  activityShortcut: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activityShortcutText: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '800',
  },
  locationButton: {
    backgroundColor: palette.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  locationButtonActive: {
    backgroundColor: '#e4efe6',
    borderColor: 'rgba(58, 102, 72, 0.18)',
  },
  locationButtonText: {
    color: palette.clay,
    fontWeight: '800',
    fontSize: 12,
  },
  locationButtonTextActive: {
    color: palette.sageDark,
  },
  locationHint: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  searchHint: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  aiSearchButton: {
    backgroundColor: '#e4efe6',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  aiSearchButtonText: {
    color: palette.sageDark,
    fontWeight: '800',
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.55,
  },
  searchFilterButton: {
    backgroundColor: palette.parchment,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchFilterButtonText: {
    color: palette.clay,
    fontWeight: '800',
    fontSize: 12,
  },
  searchClearButton: {
    backgroundColor: palette.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  searchClearButtonText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  filterGlyph: {
    color: palette.clay,
    fontSize: 14,
    lineHeight: 14,
    fontWeight: '700',
  },
  aiReviewCard: {
    gap: 10,
    backgroundColor: '#eef6ed',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
    padding: 14,
  },
  aiReviewTitle: {
    color: palette.sageDark,
    fontSize: 15,
    fontWeight: '800',
  },
  aiReviewMeta: {
    color: palette.muted,
    fontSize: 12,
  },
  aiReviewSource: {
    color: palette.clay,
    fontSize: 12,
    lineHeight: 17,
  },
  aiReviewChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aiReviewChip: {
    backgroundColor: palette.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  aiReviewChipText: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '700',
  },
  aiReviewNotes: {
    gap: 4,
  },
  aiReviewNote: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  aiReviewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  aiApplyButton: {
    flex: 1,
    backgroundColor: palette.sage,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  aiApplyButtonText: {
    color: palette.cream,
    fontWeight: '800',
    fontSize: 13,
  },
  aiDismissButton: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  aiDismissButtonText: {
    color: palette.clay,
    fontWeight: '800',
    fontSize: 13,
  },
  recentSection: {
    gap: 12,
  },
  recentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  recentSectionText: {
    flex: 1,
    minWidth: 0,
  },
  recentSectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  recentSectionTitle: {
    color: palette.soil,
    fontSize: 16,
    fontWeight: '800',
  },
  recentSectionLink: {
    color: palette.sageDark,
    fontSize: 13,
    fontWeight: '800',
  },
  recentToggle: {
    minWidth: 58,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  recentToggleText: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '800',
  },
  recentScroll: {
    gap: 10,
    paddingRight: 8,
  },
  recentCard: {
    width: 156,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  recentImage: {
    width: '100%',
    height: 92,
    backgroundColor: '#e6ece4',
  },
  recentImageFallback: {
    width: '100%',
    height: 92,
    backgroundColor: '#e6ece4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentImageFallbackText: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '700',
  },
  recentText: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  recentTitle: {
    color: palette.soil,
    fontSize: 14,
    fontWeight: '800',
  },
  recentMeta: {
    color: palette.muted,
    fontSize: 12,
  },
  loading: {
    gap: 16,
  },
  list: {
    gap: 16,
    paddingBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
})
