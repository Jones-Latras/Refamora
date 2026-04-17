import { useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '../../components/EmptyState'
import { ListingCard } from '../../components/ListingCard'
import { ListingStatusBadge } from '../../components/ListingStatusBadge'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { useListingDraftStore } from '../../hooks/useListingDrafts'
import { useFarmerListings } from '../../hooks/useListings'
import type {
  ListingActivityItem,
  ListingPerformanceSummary,
  ListingStatus,
} from '../../types/app'
import {
  getSellerListingActivity,
  getSellerListingPerformance,
  setListingsStatus,
  setListingStatus,
} from '../../services/listingService'
import { formatDateTime } from '../../utils/formatters'
import { palette, radii } from '../../utils/theme'

function getListingAgeInDays(createdAt: string) {
  const diffMs = Date.now() - new Date(createdAt).getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

export default function MyListingsScreen() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { data, isLoading, refetch } = useFarmerListings(user?.id)
  const savedDraft = useListingDraftStore((state) =>
    user?.id ? state.draftsByUser[user.id] ?? null : null,
  )
  const [performance, setPerformance] = useState<ListingPerformanceSummary[]>([])
  const [activity, setActivity] = useState<ListingActivityItem[]>([])
  const [expandedListingId, setExpandedListingId] = useState<string | null>(null)

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

  const openStatusMenu = (listingId: string, currentStatus: ListingStatus) => {
    Alert.alert('Update listing status', 'Choose the new visibility for this listing.', [
      {
        text: 'Keep Active',
        onPress: () => void handleStatusChange(listingId, 'active', currentStatus),
      },
      {
        text: 'Mark as Sold',
        onPress: () => void handleStatusChange(listingId, 'sold', currentStatus),
      },
      {
        text: 'Mark Unavailable',
        onPress: () =>
          void handleStatusChange(listingId, 'unavailable', currentStatus),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ])
  }

  const performanceByListing = new Map(
    performance.map((item) => [item.listingId, item]),
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
          text: 'Mark Unavailable',
          onPress: () => void handleBulkStatusChange('unavailable'),
        },
        {
          text: 'Mark as Sold',
          onPress: () => void handleBulkStatusChange('sold'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    )
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      {isLoading && data === null ? (
        <View style={styles.center}>
          <Text style={styles.helper}>Loading your listings...</Text>
        </View>
      ) : data && data.length > 0 ? (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            savedDraft || olderActiveListings.length > 0 ? (
              <View style={styles.headerStack}>
                {savedDraft ? (
                  <View style={styles.draftCard}>
                    <View style={styles.draftHeader}>
                      <View style={styles.draftText}>
                        <View style={styles.draftTitleRow}>
                          <Text style={styles.draftTitle}>
                            {savedDraft.values.title.trim() || 'Untitled draft listing'}
                          </Text>
                          <ListingStatusBadge status="draft" />
                        </View>
                        <Text style={styles.draftDescription}>
                          Last updated {formatDateTime(savedDraft.updatedAt)}. Resume this draft
                          to finish and publish it.
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => router.push('/(farmer)/create-listing')}
                        style={styles.draftAction}
                      >
                        <Text style={styles.draftActionText}>Resume draft</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                {olderActiveListings.length > 0 ? (
                  <View style={styles.bulkCard}>
                    <View style={styles.bulkHeader}>
                      <View style={styles.bulkText}>
                        <Text style={styles.bulkTitle}>Older active listings</Text>
                        <Text style={styles.bulkDescription}>
                          {olderActiveListings.length} listing
                          {olderActiveListings.length === 1 ? '' : 's'} have been live
                          for 30+ days and may need a status cleanup.
                        </Text>
                      </View>
                      <Pressable onPress={openBulkStatusMenu} style={styles.bulkAction}>
                        <Text style={styles.bulkActionText}>Bulk update</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.item}>
              <ListingCard
                listing={item}
                onPress={() => router.push(`/(farmer)/edit-listing/${item.id}`)}
              />
              <View style={styles.performanceRow}>
                <View style={styles.performanceChip}>
                  <Text style={styles.performanceValue}>
                    {performanceByListing.get(item.id)?.viewCount ?? 0}
                  </Text>
                  <Text style={styles.performanceLabel}>Views</Text>
                </View>
                <View style={styles.performanceChip}>
                  <Text style={styles.performanceValue}>
                    {performanceByListing.get(item.id)?.inquiryCount ?? 0}
                  </Text>
                  <Text style={styles.performanceLabel}>Inquiries</Text>
                </View>
                <View style={styles.performanceChip}>
                  <Text style={styles.performanceValue}>
                    {performanceByListing.get(item.id)?.pendingInquiryCount ?? 0}
                  </Text>
                  <Text style={styles.performanceLabel}>Pending</Text>
                </View>
              </View>
              <View style={styles.timelineCard}>
                <View style={styles.timelineHeader}>
                  <View style={styles.timelineHeaderText}>
                    <Text style={styles.timelineTitle}>Activity timeline</Text>
                    <Text style={styles.timelineSubtitle}>
                      {(activityByListing.get(item.id)?.length ?? 0) > 0
                        ? `${Math.min(
                            activityByListing.get(item.id)?.length ?? 0,
                            4,
                          )} recent event${
                            (activityByListing.get(item.id)?.length ?? 0) === 1
                              ? ''
                              : 's'
                          }`
                        : 'No activity yet'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      setExpandedListingId((current) =>
                        current === item.id ? null : item.id,
                      )
                    }
                    style={styles.timelineToggle}
                  >
                    <Text style={styles.timelineToggleText}>
                      {expandedListingId === item.id ? 'Hide' : 'View'}
                    </Text>
                  </Pressable>
                </View>

                {expandedListingId === item.id ? (
                  <View style={styles.timelineStack}>
                    {(activityByListing.get(item.id) ?? []).slice(0, 4).map((event) => (
                      <View key={event.id} style={styles.timelineItem}>
                        <View style={styles.timelineDot} />
                        <View style={styles.timelineItemText}>
                          <Text style={styles.timelineItemTitle}>{event.title}</Text>
                          <Text style={styles.timelineItemDescription}>
                            {event.description}
                          </Text>
                          <Text style={styles.timelineItemMeta}>
                            {formatDateTime(event.createdAt)}
                          </Text>
                        </View>
                      </View>
                    ))}

                    {(activityByListing.get(item.id)?.length ?? 0) === 0 ? (
                      <Text style={styles.timelineEmpty}>
                        Buyer views and inquiries will appear here as this listing gets attention.
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => router.push(`/(farmer)/edit-listing/${item.id}`)}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Edit Listing</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/(farmer)/create-listing',
                      params: { duplicateFromId: item.id },
                    })
                  }
                  style={styles.tertiaryButton}
                >
                  <Text style={styles.tertiaryButtonText}>Duplicate</Text>
                </Pressable>
                <Pressable
                  onPress={() => openStatusMenu(item.id, item.status)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Change Status</Text>
                </Pressable>
              </View>
            </View>
          )}
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
    padding: 24,
    gap: 16,
  },
  item: {
    gap: 10,
  },
  headerStack: {
    gap: 14,
    marginBottom: 16,
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
  performanceRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  performanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#eef5ef',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  performanceValue: {
    color: palette.soil,
    fontSize: 12,
    fontWeight: '900',
  },
  performanceLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  timelineCard: {
    gap: 10,
    backgroundColor: '#f8faf7',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineHeaderText: {
    flex: 1,
    gap: 2,
  },
  timelineTitle: {
    color: palette.soil,
    fontSize: 14,
    fontWeight: '800',
  },
  timelineSubtitle: {
    color: palette.muted,
    fontSize: 12,
  },
  timelineToggle: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timelineToggleText: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '800',
  },
  timelineStack: {
    gap: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 5,
    backgroundColor: palette.sage,
  },
  timelineItemText: {
    flex: 1,
    gap: 2,
  },
  timelineItemTitle: {
    color: palette.soil,
    fontSize: 13,
    fontWeight: '800',
  },
  timelineItemDescription: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  timelineItemMeta: {
    color: palette.clay,
    fontSize: 12,
  },
  timelineEmpty: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryButton: {
    flex: 1,
    minWidth: 120,
    backgroundColor: palette.sage,
    borderRadius: radii.md,
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: palette.cream,
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#efe1c3',
    borderRadius: radii.md,
    alignItems: 'center',
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: palette.clay,
    fontWeight: '800',
  },
  tertiaryButton: {
    flex: 1,
    minWidth: 120,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    paddingVertical: 14,
  },
  tertiaryButtonText: {
    color: palette.clay,
    fontWeight: '800',
  },
})
