import { useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ErrorState } from '../../components/ErrorState'
import { ListingCard } from '../../components/ListingCard'
import { DashboardScreenSkeleton } from '../../components/ScreenSkeleton'
import { useToast } from '../../components/Toast'
import { useSavedListingsStore } from '../../hooks/useSavedListings'
import { getListingPreviewsByIds } from '../../services/listingService'
import type { ListingPreview } from '../../types/app'
import { palette } from '../../utils/theme'

export default function BuyerSavedListingsScreen() {
  const { showToast } = useToast()
  const savedListingIds = useSavedListingsStore((state) => state.listingIds)
  const [savedListings, setSavedListings] = useState<ListingPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadSavedListings = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    if (savedListingIds.length === 0) {
      setSavedListings([])
      setIsLoading(false)
      return
    }

    const result = await getListingPreviewsByIds(savedListingIds)

    if (result.error) {
      showToast(result.error.message, 'error')
      setSavedListings([])
      setLoadError('Saved listings could not be loaded right now.')
      setIsLoading(false)
      return
    }

    setSavedListings(result.data ?? [])
    setIsLoading(false)
  }, [savedListingIds, showToast])

  useFocusEffect(
    useCallback(() => {
      void loadSavedListings()
    }, [loadSavedListings]),
  )

  const helperText = useMemo(
    () =>
      savedListingIds.length === 0
        ? 'Listings you save from the feed, map, or detail page will appear here.'
        : `${savedListingIds.length} listing${
            savedListingIds.length === 1 ? '' : 's'
          } saved on this device for quick comparison.`,
    [savedListingIds.length],
  )

  if (isLoading) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <DashboardScreenSkeleton />
      </SafeAreaView>
    )
  }

  if (loadError && savedListings.length === 0) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.errorWrapper}>
          <ErrorState
            title="Saved listings could not be loaded"
            description="Refamora could not open your saved listings right now. Try again to refresh them."
            onAction={() => {
              void loadSavedListings()
            }}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {savedListings.length > 0 ? (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroText}>
                <Text style={styles.heroTitle}>Saved listings</Text>
                <Text style={styles.heroSubtitle}>{helperText}</Text>
              </View>
              <Pressable
                onPress={() => router.push('/(buyer)/feed')}
                style={styles.heroAction}
              >
                <Text style={styles.heroActionText}>Browse feed</Text>
              </Pressable>
            </View>

            <View style={styles.stack}>
              {savedListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onPress={() => router.push(`/(shared)/listing/${listing.id}`)}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No saved listings yet</Text>
            <Text style={styles.emptyText}>
              {helperText}
            </Text>
            <Pressable
              onPress={() => router.push('/(buyer)/feed')}
              style={styles.heroAction}
            >
              <Text style={styles.heroActionText}>Browse feed</Text>
            </Pressable>
          </View>
        )}
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
    paddingBottom: 32,
  },
  errorWrapper: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  heroCard: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 12,
  },
  heroText: {
    gap: 4,
  },
  heroTitle: {
    color: palette.soil,
    fontSize: 22,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: palette.muted,
    lineHeight: 20,
  },
  heroAction: {
    alignSelf: 'flex-start',
    backgroundColor: '#e4efe6',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  heroActionText: {
    color: palette.sageDark,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 24,
    gap: 12,
  },
  emptyTitle: {
    color: palette.soil,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: palette.muted,
    lineHeight: 22,
  },
  stack: {
    gap: 12,
  },
})
