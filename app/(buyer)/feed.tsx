import { useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
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
import { AppImage } from '../../components/AppImage'
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
import { getListingPreviewsByIds } from '../../services/listingService'
import { requestCurrentCoordinates } from '../../services/locationService'
import { formatDistanceAway, getDistanceKm } from '../../utils/location'
import { palette, radii } from '../../utils/theme'

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
        <AppImage uri={imageUrl} style={styles.recentImage} />
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
  const [isLocationLoading, setIsLocationLoading] = useState(false)
  const [isRecentExpanded, setIsRecentExpanded] = useState(false)
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
                <AppImage uri={profile.avatar_url} style={styles.avatarImage} />
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
              buyerCoordinates != null) ? (
              <Pressable
                onPress={() => {
                  setQuery('')
                  setFilters({})
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
            Search by waste type, city, or keyword, then refine results with filters.
          </Text>

          <Text style={styles.locationHint}>
            {buyerCoordinates
              ? `Nearest listings are shown first for ${mappedDistanceCount} mapped result${
                  mappedDistanceCount === 1 ? '' : 's'
                }.`
              : 'Turn on location to see how far listings are from you.'}
          </Text>

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
