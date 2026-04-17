import { useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ContactRequestCard } from '../../components/ContactRequestCard'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { ListingCard } from '../../components/ListingCard'
import { DashboardScreenSkeleton } from '../../components/ScreenSkeleton'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { useRecentlyViewedStore } from '../../hooks/useRecentlyViewed'
import { useSavedListingsStore } from '../../hooks/useSavedListings'
import { getBuyerContactRequests } from '../../services/contactService'
import { getListingPreviewsByIds } from '../../services/listingService'
import type { ContactRequestSummary, ListingPreview } from '../../types/app'
import { getProfileCompletion } from '../../utils/profileCompletion'
import { palette } from '../../utils/theme'

export default function BuyerDashboardScreen() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const {
    profile,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useProfile(user?.id)
  const recentlyViewedIds = useRecentlyViewedStore((state) => state.listingIds)
  const savedListingIds = useSavedListingsStore((state) => state.listingIds)
  const [requests, setRequests] = useState<ContactRequestSummary[]>([])
  const [recentListings, setRecentListings] = useState<ListingPreview[]>([])
  const [savedListings, setSavedListings] = useState<ListingPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const profileCompletion = useMemo(() => getProfileCompletion(profile, 'buyer'), [profile])

  const loadRequests = useCallback(async () => {
    if (!user) {
      setRequests([])
      return true
    }

    const result = await getBuyerContactRequests(user.id)

    if (result.error) {
      showToast(result.error.message, 'error')
      setRequests([])
      return false
    }

    setRequests(result.data ?? [])
    return true
  }, [showToast, user])

  const loadRecentListings = useCallback(async () => {
    if (recentlyViewedIds.length === 0) {
      setRecentListings([])
      return true
    }

    const result = await getListingPreviewsByIds(recentlyViewedIds)

    if (result.error) {
      showToast(result.error.message, 'error')
      setRecentListings([])
      return false
    }

    setRecentListings(result.data ?? [])
    return true
  }, [recentlyViewedIds, showToast])

  const loadSavedListings = useCallback(async () => {
    if (savedListingIds.length === 0) {
      setSavedListings([])
      return true
    }

    const result = await getListingPreviewsByIds(savedListingIds)

    if (result.error) {
      showToast(result.error.message, 'error')
      setSavedListings([])
      return false
    }

    setSavedListings(result.data ?? [])
    return true
  }, [savedListingIds, showToast])

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    const results = await Promise.all([
      loadRequests(),
      loadRecentListings(),
      loadSavedListings(),
    ])
    const failedCount = results.filter((result) => !result).length

    if (failedCount === results.length && results.length > 0) {
      setLoadError('Buyer activity could not be loaded right now.')
    }

    setIsLoading(false)
  }, [loadRecentListings, loadRequests, loadSavedListings])

  useFocusEffect(
    useCallback(() => {
      void refetchProfile().catch(() => undefined)
      void loadDashboard()
    }, [loadDashboard, refetchProfile]),
  )

  const recentRequests = requests.slice(0, 3)
  const shouldShowSkeleton =
    (!profile && isProfileLoading) ||
    (isLoading &&
      requests.length === 0 &&
      recentListings.length === 0 &&
      savedListings.length === 0)

  if (shouldShowSkeleton) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <DashboardScreenSkeleton />
      </SafeAreaView>
    )
  }

  if (loadError && requests.length === 0 && recentListings.length === 0 && savedListings.length === 0) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.errorWrapper}>
          <ErrorState
            title="Dashboard could not be loaded"
            description="Refamora could not load your buyer activity right now. Try again to refresh your dashboard."
            onAction={() => {
              void loadDashboard()
            }}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {!profileCompletion.isComplete ? (
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>{profileCompletion.title}</Text>
            <Text style={styles.tipText}>
              {profileCompletion.completedCount} of {profileCompletion.items.length} details
              complete. {profileCompletion.summary}
            </Text>
            <Text style={styles.tipMeta}>
              Missing: {profileCompletion.missingLabels.join(', ')}
            </Text>
            <Pressable
              onPress={() => router.push('/(buyer)/profile')}
              style={styles.tipAction}
            >
              <Text style={styles.tipActionText}>{profileCompletion.nextActionLabel}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Saved listings</Text>
              <Text style={styles.sectionSubtitle}>
                {savedListings.length} listing
                {savedListings.length === 1 ? '' : 's'} saved for later
              </Text>
            </View>
            <Pressable onPress={() => router.push('/(buyer)/feed')}>
              <Text style={styles.linkText}>Browse feed</Text>
            </Pressable>
          </View>

          {savedListings.length > 0 ? (
            <View style={styles.stack}>
              {savedListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onPress={() => router.push(`/(shared)/listing/${listing.id}`)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              title="No saved listings yet"
              description="When you tap Save on a listing, it will stay here so you can compare your best options without searching again."
              actionLabel="Browse the feed"
              onAction={() => router.push('/(buyer)/feed')}
            />
          )}
        </View>

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
              description="Listings you open from the feed or map will appear here, making it easy to return to the ones you were comparing."
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
              description="You have not contacted any sellers yet. Open a listing and use Contact Seller when you want to ask about availability, pickup, or price."
              actionLabel="Browse the feed"
              onAction={() => router.push('/(buyer)/feed')}
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
  errorWrapper: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  tipCard: {
    backgroundColor: '#eef6ed',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
    padding: 16,
    gap: 8,
  },
  tipTitle: {
    color: palette.sageDark,
    fontSize: 16,
    fontWeight: '800',
  },
  tipText: {
    color: palette.sageDark,
    lineHeight: 20,
  },
  tipMeta: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  tipAction: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: palette.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  tipActionText: {
    color: palette.sageDark,
    fontSize: 13,
    fontWeight: '800',
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
