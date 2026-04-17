import { useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import { useCallback, useState } from 'react'
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
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { useFarmerListings } from '../../hooks/useListings'
import type { ListingPerformanceSummary, ListingStatus } from '../../types/app'
import {
  getSellerListingPerformance,
  setListingStatus,
} from '../../services/listingService'
import { palette, radii } from '../../utils/theme'

export default function MyListingsScreen() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { data, isLoading, refetch } = useFarmerListings(user?.id)
  const [performance, setPerformance] = useState<ListingPerformanceSummary[]>([])

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        void refetch()
        void (async () => {
          const result = await getSellerListingPerformance(user.id)

          if (result.error) {
            showToast(result.error.message, 'error')
            setPerformance([])
            return
          }

          setPerformance(result.data ?? [])
        })()
      }
    }, [refetch, showToast, user?.id]),
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
              <View style={styles.actions}>
                <Pressable
                  onPress={() => router.push(`/(farmer)/edit-listing/${item.id}`)}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Edit Listing</Text>
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
            description="Create your first listing to start showing availability, pricing, and status."
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
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
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
    backgroundColor: '#efe1c3',
    borderRadius: radii.md,
    alignItems: 'center',
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: palette.clay,
    fontWeight: '800',
  },
})
