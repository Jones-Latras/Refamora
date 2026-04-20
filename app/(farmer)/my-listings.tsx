import { Feather } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { FulfillmentLabel } from '../../components/FulfillmentLabel'
import { AppImage } from '../../components/AppImage'
import { ListingStatusBadge } from '../../components/ListingStatusBadge'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { useListingDraftStore } from '../../hooks/useListingDrafts'
import { useFarmerListings } from '../../hooks/useListings'
import {
  deleteListing,
  getSellerListingActivity,
  getSellerListingPerformance,
  setListingsStatus,
  setListingStatus,
} from '../../services/listingService'
import type {
  ListingActivityItem,
  ListingPerformanceSummary,
  ListingPreview,
  ListingStatus,
} from '../../types/app'
import { formatDate, formatDateTime, formatPrice, titleCase } from '../../utils/formatters'
import { palette, radii, shadow } from '../../utils/theme'

type StatusFilter = 'all' | ListingStatus
type SortMode = 'newest' | 'oldest' | 'price_high' | 'price_low'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Sold' },
  { value: 'unavailable', label: 'Paused' },
]

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price_high', label: 'High price' },
  { value: 'price_low', label: 'Low price' },
]

function getListingAgeInDays(createdAt: string) {
  const diffMs = Date.now() - new Date(createdAt).getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

function formatWasteTypeLabel(value: string) {
  return titleCase(value.replaceAll('_', ' '))
}

function formatListingQuantity(quantity: number, unit: string) {
  const displayQuantity = Number.isInteger(quantity)
    ? String(quantity)
    : quantity.toFixed(2).replace(/\.?0+$/, '')

  return `${displayQuantity} ${unit}`
}

function getCompactListingTitle(listing: ListingPreview) {
  const cleanedTitle = listing.title
    .replace(/\s*[-|]\s*\d+(?:\.\d+)?\s*[a-zA-Z]+\s*$/u, '')
    .trim()

  return cleanedTitle || formatWasteTypeLabel(listing.wasteType)
}

function buildActivityHighlights(
  listing: ListingPreview,
  performance: ListingPerformanceSummary | undefined,
  listingActivity: ListingActivityItem[],
) {
  const highlights = [`Created on ${formatDate(listing.createdAt)}`]
  const inquiryCount = performance?.inquiryCount ?? 0
  const pendingCount = performance?.pendingInquiryCount ?? 0
  const viewCount = performance?.viewCount ?? 0
  const latestBuyerEvent = listingActivity.find(
    (event) => event.type !== 'listing_created',
  )

  if (inquiryCount > 0) {
    highlights.push(
      `${inquiryCount} ${inquiryCount === 1 ? 'inquiry' : 'inquiries'} received${
        pendingCount > 0
          ? ` • ${pendingCount} ${pendingCount === 1 ? 'pending' : 'pending'}`
          : ''
      }`,
    )
  } else {
    highlights.push('No buyer inquiries yet')
  }

  highlights.push(
    viewCount > 0
      ? `${viewCount} ${viewCount === 1 ? 'view' : 'views'} so far`
      : 'No buyer views yet',
  )

  if (latestBuyerEvent) {
    highlights.push(
      `${latestBuyerEvent.title} on ${formatDateTime(latestBuyerEvent.createdAt)}`,
    )
  }

  return highlights.slice(0, 4)
}

export default function MyListingsScreen() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { data, isLoading, error, refetch } = useFarmerListings(user?.id)
  const savedDraft = useListingDraftStore((state) =>
    user?.id ? state.draftsByUser[user.id] ?? null : null,
  )
  const [performance, setPerformance] = useState<ListingPerformanceSummary[]>([])
  const [activity, setActivity] = useState<ListingActivityItem[]>([])
  const [expandedListingId, setExpandedListingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('newest')

  const refreshSupportingData = useCallback(async () => {
    if (!user?.id) {
      setPerformance([])
      setActivity([])
      return
    }

    const [performanceResult, activityResult] = await Promise.all([
      getSellerListingPerformance(user.id),
      getSellerListingActivity(user.id),
    ])

    if (performanceResult.error) {
      showToast(performanceResult.error.message, 'error')
      setPerformance([])
    } else {
      setPerformance(performanceResult.data ?? [])
    }

    if (activityResult.error) {
      showToast(activityResult.error.message, 'error')
      setActivity([])
    } else {
      setActivity(activityResult.data ?? [])
    }
  }, [showToast, user?.id])

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        void refetch()
        void refreshSupportingData()
      }
    }, [refetch, refreshSupportingData, user?.id]),
  )

  const handleStatusChange = async (
    listingId: string,
    status: ListingStatus,
    currentStatus: ListingStatus,
  ) => {
    if (status === currentStatus) {
      showToast(`Listing is already ${status}.`, 'info')
      return
    }

    const result = await setListingStatus(listingId, status)

    if (result.error) {
      showToast(result.error.message, 'error')
      return
    }

    showToast(`Listing marked as ${status}.`, 'success')
    await refetch()
    await refreshSupportingData()
  }

  const handleDeleteListing = async (listingId: string) => {
    const result = await deleteListing(listingId)

    if (result.error) {
      showToast(result.error.message, 'error')
      return
    }

    setExpandedListingId((current) => (current === listingId ? null : current))
    showToast('Listing deleted.', 'success')
    await refetch()
    await refreshSupportingData()
  }

  const confirmDeleteListing = (listingId: string) => {
    Alert.alert(
      'Delete listing',
      'This will permanently remove the listing from your account and buyers will no longer be able to find it.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void handleDeleteListing(listingId),
        },
      ],
    )
  }

  const openListingActions = (listingId: string, currentStatus: ListingStatus) => {
    const actions: {
      text: string
      onPress?: () => void
      style?: 'cancel'
    }[] = [
      {
        text: 'Duplicate Listing',
        onPress: () =>
          router.push({
            pathname: '/(farmer)/create-listing',
            params: { duplicateFromId: listingId },
          }),
      },
    ]

    if (currentStatus !== 'sold') {
      actions.push({
        text: 'Mark as Sold',
        onPress: () => void handleStatusChange(listingId, 'sold', currentStatus),
      })
    }

    if (currentStatus !== 'unavailable') {
      actions.push({
        text: 'Pause Listing',
        onPress: () => void handleStatusChange(listingId, 'unavailable', currentStatus),
      })
    }

    if (currentStatus !== 'active') {
      actions.push({
        text: 'Mark as Active',
        onPress: () => void handleStatusChange(listingId, 'active', currentStatus),
      })
    }

    actions.push({ text: 'Cancel', style: 'cancel' })

    Alert.alert('Listing actions', 'Choose what to do with this listing.', actions)
  }

  const performanceByListing = useMemo(
    () => new Map(performance.map((item) => [item.listingId, item])),
    [performance],
  )

  const activityByListing = useMemo(
    () =>
      activity.reduce(
        (map, item) => {
          const current = map.get(item.listingId) ?? []
          current.push(item)
          map.set(item.listingId, current)
          return map
        },
        new Map<string, ListingActivityItem[]>(),
      ),
    [activity],
  )

  const olderActiveListings = useMemo(
    () =>
      (data ?? []).filter(
        (listing) =>
          listing.status === 'active' && getListingAgeInDays(listing.createdAt) >= 30,
      ),
    [data],
  )

  const filteredListings = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const source = [...(data ?? [])]

    const filtered = source.filter((listing) => {
      if (statusFilter !== 'all' && listing.status !== statusFilter) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      const searchable = [
        listing.title,
        listing.city,
        formatWasteTypeLabel(listing.wasteType),
      ]
        .join(' ')
        .toLowerCase()

      return searchable.includes(normalizedQuery)
    })

    filtered.sort((left, right) => {
      if (sortMode === 'oldest') {
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      }

      if (sortMode === 'price_high') {
        return right.price - left.price
      }

      if (sortMode === 'price_low') {
        return left.price - right.price
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    })

    return filtered
  }, [data, searchQuery, sortMode, statusFilter])

  const handleBulkStatusChange = async (status: ListingStatus) => {
    const listingIds = olderActiveListings.map((listing) => listing.id)

    if (listingIds.length === 0) {
      showToast('No older active listings need a bulk update right now.', 'info')
      return
    }

    const result = await setListingsStatus(listingIds, status)

    if (result.error) {
      showToast(result.error.message, 'error')
      return
    }

    showToast(
      `${listingIds.length} older listing${
        listingIds.length === 1 ? '' : 's'
      } marked as ${status}.`,
      'success',
    )
    await refetch()
    await refreshSupportingData()
  }

  const openBulkStatusMenu = () => {
    if (olderActiveListings.length === 0) {
      showToast('No older active listings need a bulk update right now.', 'info')
      return
    }

    Alert.alert(
      'Bulk update older listings',
      `Choose a status for ${olderActiveListings.length} active listing${
        olderActiveListings.length === 1 ? '' : 's'
      } that have been live for 30+ days.`,
      [
        {
          text: 'Pause listings',
          onPress: () => void handleBulkStatusChange('unavailable'),
        },
        {
          text: 'Mark as sold',
          onPress: () => void handleBulkStatusChange('sold'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    )
  }

  const renderHeader = () => (
    <View style={styles.headerStack}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderText}>
          <Text style={styles.pageTitle}>My Listings</Text>
          <Text style={styles.pageSubtitle}>
            {data?.length ?? 0} total listing{(data?.length ?? 0) === 1 ? '' : 's'}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(farmer)/create-listing')}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>Add listing</Text>
        </Pressable>
      </View>

      <View style={styles.utilityCard}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search title, waste type, or city"
          placeholderTextColor={palette.muted}
          style={styles.searchInput}
        />
        <View style={styles.chipRow}>
          {STATUS_FILTERS.map((filter) => {
            const selected = statusFilter === filter.value

            return (
              <Pressable
                key={filter.value}
                onPress={() => setStatusFilter(filter.value)}
                style={[styles.utilityChip, selected ? styles.utilityChipActive : null]}
              >
                <Text
                  style={[
                    styles.utilityChipText,
                    selected ? styles.utilityChipTextActive : null,
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <View style={styles.chipRow}>
          {SORT_OPTIONS.map((option) => {
            const selected = sortMode === option.value

            return (
              <Pressable
                key={option.value}
                onPress={() => setSortMode(option.value)}
                style={[styles.utilityChip, selected ? styles.utilityChipActive : null]}
              >
                <Text
                  style={[
                    styles.utilityChipText,
                    selected ? styles.utilityChipTextActive : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {savedDraft ? (
        <View style={styles.draftCard}>
          <View style={styles.draftHeader}>
            <View style={styles.draftText}>
              <View style={styles.draftTitleRow}>
                <Feather name="file-text" size={14} color={palette.clay} />
                <Text style={styles.draftTitle}>
                  {savedDraft.values.title.trim() || 'Untitled draft listing'}
                </Text>
                <ListingStatusBadge status="draft" />
              </View>
              <Text style={styles.draftDescription}>
                Last updated {formatDateTime(savedDraft.updatedAt)}. Resume this draft to
                finish and publish it.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/(farmer)/create-listing')}
              style={[styles.draftAction, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
            >
              <Feather name="edit-3" size={12} color={palette.clay} />
              <Text style={styles.draftActionText}>Resume</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {olderActiveListings.length > 0 ? (
        <View style={styles.bulkCard}>
          <View style={styles.bulkHeader}>
            <View style={styles.bulkText}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="alert-circle" size={14} color={palette.harvest} />
                <Text style={styles.bulkTitle}>Older active listings</Text>
              </View>
              <Text style={styles.bulkDescription}>
                {olderActiveListings.length} listing
                {olderActiveListings.length === 1 ? '' : 's'} have been live for 30+
                days and may need a status cleanup.
              </Text>
            </View>
            <Pressable onPress={openBulkStatusMenu} style={[styles.bulkAction, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
              <Feather name="refresh-cw" size={12} color={palette.clay} />
              <Text style={styles.bulkActionText}>Bulk update</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  )

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      {isLoading && data === null ? (
        <View style={styles.center}>
          <Text style={styles.helper}>Loading your listings...</Text>
        </View>
      ) : error && (!data || data.length === 0) ? (
        <View style={styles.list}>
          <ErrorState
            title="Listings could not be loaded"
            description="Refamora could not load your seller listings right now. Try again to refresh them."
            onAction={() => {
              void refetch()
              void refreshSupportingData()
            }}
          />
        </View>
      ) : data && data.length > 0 ? (
        <FlatList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.filteredEmpty}>
              <EmptyState
                title="No listings match"
                description="Try a different search term, filter, or sort option to find the listing you want to manage."
                actionLabel="Clear filters"
                onAction={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                  setSortMode('newest')
                }}
              />
            </View>
          }
          renderItem={({ item }) => {
            const isExpanded = expandedListingId === item.id
            const listingPerformance = performanceByListing.get(item.id)
            const listingActivity = activityByListing.get(item.id) ?? []
            const activityHighlights = buildActivityHighlights(
              item,
              listingPerformance,
              listingActivity,
            )

            return (
              <View style={styles.listingBlock}>
                <Pressable
                  onPress={() =>
                    setExpandedListingId((current) => (current === item.id ? null : item.id))
                  }
                  style={styles.compactCard}
                >
                  {item.imageUrl ? (
                    <AppImage uri={item.imageUrl} style={styles.compactImage} />
                  ) : (
                    <View style={styles.compactImagePlaceholder}>
                      <Text style={styles.compactImageLabel}>
                        {formatWasteTypeLabel(item.wasteType)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.compactContent}>
                    <View style={styles.compactHeader}>
                      <Text style={styles.compactTitle}>{getCompactListingTitle(item)}</Text>
                      <ListingStatusBadge status={item.status} />
                    </View>
                    <Text style={styles.compactMeta}>
                      {item.city} • {formatListingQuantity(item.quantity, item.unit)}
                    </Text>
                    <Text style={styles.compactPrice}>{formatPrice(item.price, item.unit)}</Text>
                    <View style={styles.compactFooter}>
                      <FulfillmentLabel type={item.fulfillmentType} />
                      <Text style={styles.compactFooterText}>
                        Created {formatDate(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.manageToggle, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                    <Text style={styles.manageToggleText}>
                      {isExpanded ? 'Hide' : 'Manage'}
                    </Text>
                    <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={palette.sageDark} />
                  </View>
                </Pressable>

                {isExpanded ? (
                  <View style={styles.expandedPanel}>
                    <View style={styles.performanceRow}>
                      <View style={styles.performanceChip}>
                        <Feather name="eye" size={14} color={palette.sageDark} style={{ marginBottom: 2 }} />
                        <Text style={styles.performanceValue}>
                          {listingPerformance?.viewCount ?? 0}
                        </Text>
                        <Text style={styles.performanceLabel}>Views</Text>
                      </View>
                      <View style={styles.performanceChip}>
                        <Feather name="message-circle" size={14} color={palette.sageDark} style={{ marginBottom: 2 }} />
                        <Text style={styles.performanceValue}>
                          {listingPerformance?.inquiryCount ?? 0}
                        </Text>
                        <Text style={styles.performanceLabel}>Inquiries</Text>
                      </View>
                      <View style={styles.performanceChip}>
                        <Feather name="clock" size={14} color={palette.sageDark} style={{ marginBottom: 2 }} />
                        <Text style={styles.performanceValue}>
                          {listingPerformance?.pendingInquiryCount ?? 0}
                        </Text>
                        <Text style={styles.performanceLabel}>Pending</Text>
                      </View>
                    </View>

                    <View style={styles.activityCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Feather name="activity" size={14} color={palette.soil} />
                        <Text style={styles.activityTitle}>Recent activity</Text>
                      </View>
                      {activityHighlights.map((line) => (
                        <Text key={line} style={styles.activityLine}>
                          • {line}
                        </Text>
                      ))}
                    </View>

                    <View style={styles.actions}>
                      <Pressable
                        onPress={() => router.push(`/(farmer)/edit-listing/${item.id}`)}
                        style={[styles.primaryButton, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
                      >
                        <Feather name="edit-2" size={14} color={palette.cream} />
                        <Text style={styles.primaryButtonText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => openListingActions(item.id, item.status)}
                        style={[styles.secondaryButton, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
                      >
                        <Feather name="more-horizontal" size={14} color={palette.clay} />
                        <Text style={styles.secondaryButtonText}>More actions</Text>
                      </Pressable>
                    </View>
                    <Pressable
                      onPress={() => confirmDeleteListing(item.id)}
                      style={[styles.deleteButton, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
                    >
                      <Feather name="trash-2" size={14} color={palette.error} />
                      <Text style={styles.deleteButtonText}>Delete listing</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            )
          }}
        />
      ) : (
        <View style={styles.list}>
          <EmptyState
            title="No listings yet"
            description="You have not published a listing yet. Create one to show buyers your waste type, quantity, location, and current availability."
            actionLabel="Create your first listing"
            onAction={() => router.push('/(farmer)/create-listing')}
          />
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helper: {
    color: palette.muted,
  },
  list: {
    padding: 20,
    gap: 18,
    paddingBottom: 32,
  },
  headerStack: {
    gap: 14,
    marginBottom: 18,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pageHeaderText: {
    flex: 1,
    gap: 4,
  },
  pageTitle: {
    color: palette.soil,
    fontSize: 24,
    fontWeight: '800',
  },
  pageSubtitle: {
    color: palette.muted,
    fontSize: 13,
  },
  addButton: {
    borderRadius: 999,
    backgroundColor: palette.sageDark,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addButtonText: {
    color: palette.cream,
    fontSize: 12,
    fontWeight: '800',
  },
  utilityCard: {
    gap: 10,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    ...shadow,
  },
  searchInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#f8faf7',
    color: palette.soil,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  utilityChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  utilityChipActive: {
    backgroundColor: palette.sage,
    borderColor: palette.sage,
  },
  utilityChipText: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '700',
  },
  utilityChipTextActive: {
    color: palette.cream,
  },
  draftCard: {
    gap: 10,
    backgroundColor: '#eef4fb',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(66, 113, 163, 0.16)',
    padding: 14,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  draftText: {
    flex: 1,
    gap: 6,
  },
  draftTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  draftTitle: {
    color: palette.soil,
    fontSize: 15,
    fontWeight: '800',
  },
  draftDescription: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  draftAction: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  draftActionText: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '800',
  },
  bulkCard: {
    gap: 10,
    backgroundColor: '#fff7ea',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(176, 126, 40, 0.2)',
    padding: 14,
  },
  bulkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  bulkText: {
    flex: 1,
    gap: 4,
  },
  bulkTitle: {
    color: palette.soil,
    fontSize: 15,
    fontWeight: '800',
  },
  bulkDescription: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  bulkAction: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bulkActionText: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '800',
  },
  filteredEmpty: {
    paddingTop: 8,
  },
  listingBlock: {
    gap: 10,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    ...shadow,
  },
  compactImage: {
    width: 88,
    height: 88,
    borderRadius: 14,
    backgroundColor: palette.parchment,
  },
  compactImagePlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 14,
    backgroundColor: '#eef1ee',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  compactImageLabel: {
    color: palette.soil,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  compactContent: {
    flex: 1,
    gap: 6,
  },
  compactHeader: {
    gap: 6,
  },
  compactTitle: {
    color: palette.soil,
    fontSize: 16,
    fontWeight: '800',
  },
  compactMeta: {
    color: palette.muted,
    fontSize: 13,
  },
  compactPrice: {
    color: palette.sageDark,
    fontSize: 16,
    fontWeight: '900',
  },
  compactFooter: {
    gap: 6,
  },
  compactFooterText: {
    color: palette.clay,
    fontSize: 12,
  },
  manageToggle: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#f4f7f1',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  manageToggleText: {
    color: palette.sageDark,
    fontSize: 12,
    fontWeight: '800',
  },
  expandedPanel: {
    gap: 10,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
  },
  performanceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  performanceChip: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#eef5ef',
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  performanceValue: {
    color: palette.soil,
    fontSize: 18,
    fontWeight: '900',
  },
  performanceLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  activityCard: {
    gap: 8,
    borderRadius: 16,
    backgroundColor: '#f8faf7',
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
  },
  activityTitle: {
    color: palette.soil,
    fontSize: 14,
    fontWeight: '800',
  },
  activityLine: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: palette.sage,
    borderRadius: radii.md,
    alignItems: 'center',
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: palette.cream,
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    paddingVertical: 13,
  },
  secondaryButtonText: {
    color: palette.clay,
    fontWeight: '800',
  },
  deleteButton: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(160, 69, 50, 0.2)',
    backgroundColor: '#fbf0ec',
    alignItems: 'center',
    paddingVertical: 13,
  },
  deleteButtonText: {
    color: palette.error,
    fontWeight: '800',
  },
})
