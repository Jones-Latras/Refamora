import { useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ContactRequestCard } from '../../components/ContactRequestCard'
import { EmptyState } from '../../components/EmptyState'
import { ListingCard } from '../../components/ListingCard'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { useRecentlyViewedStore } from '../../hooks/useRecentlyViewed'
import { getBuyerContactRequests } from '../../services/contactService'
import { getListingPreviewsByIds } from '../../services/listingService'
import type { ContactRequestSummary, ListingPreview } from '../../types/app'
import { palette } from '../../utils/theme'

export default function BuyerDashboardScreen() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const recentlyViewedIds = useRecentlyViewedStore((state) => state.listingIds)
  const [requests, setRequests] = useState<ContactRequestSummary[]>([])
  const [recentListings, setRecentListings] = useState<ListingPreview[]>([])

  const loadRequests = useCallback(async () => {
    if (!user) {
      setRequests([])
      return
    }

    const result = await getBuyerContactRequests(user.id)

    if (result.error) {
      showToast(result.error.message, 'error')
      setRequests([])
      return
    }

    setRequests(result.data ?? [])
  }, [showToast, user])

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

    setRecentListings(result.data ?? [])
  }, [recentlyViewedIds, showToast])

  useFocusEffect(
    useCallback(() => {
      void loadRequests()
      void loadRecentListings()
    }, [loadRecentListings, loadRequests]),
  )

  const recentRequests = requests.slice(0, 3)

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recently viewed</Text>
              <Text style={styles.sectionSubtitle}>
                {recentListings.length} listing
                {recentListings.length === 1 ? '' : 's'} tracked
              </Text>
            </View>
            <Pressable onPress={() => router.push('/(buyer)/feed')}>
              <Text style={styles.linkText}>Browse feed</Text>
            </Pressable>
          </View>

          {recentListings.length > 0 ? (
            <View style={styles.stack}>
              {recentListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onPress={() => router.push(`/(shared)/listing/${listing.id}`)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              title="No recently viewed listings yet"
              description="Open any listing from the feed or map and it will appear here."
              actionLabel="Browse the feed"
              onAction={() => router.push('/(buyer)/feed')}
            />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Sent contact requests</Text>
              <Text style={styles.sectionSubtitle}>
                {requests.length} request{requests.length === 1 ? '' : 's'} sent
              </Text>
            </View>
            <Pressable onPress={() => router.push('/(buyer)/requests')}>
              <Text style={styles.linkText}>View all</Text>
            </Pressable>
          </View>

          {recentRequests.length > 0 ? (
            <View style={styles.stack}>
              {recentRequests.map((request) => (
                <ContactRequestCard
                  key={request.id}
                  request={request}
                  role="buyer"
                />
              ))}
            </View>
          ) : (
            <EmptyState
              title="No contact requests sent"
              description="Open a listing and use Contact Seller to start an inquiry."
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  content: {
    padding: 24,
    gap: 18,
  },
  section: {
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionTitle: {
    color: palette.soil,
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: palette.muted,
    marginTop: 2,
  },
  linkText: {
    color: palette.sageDark,
    fontWeight: '700',
  },
  stack: {
    gap: 12,
  },
})
