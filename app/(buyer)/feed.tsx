import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '../../components/EmptyState'
import { FeedFilterSheet } from '../../components/FeedFilterSheet'
import { ListingCard } from '../../components/ListingCard'
import { SkeletonCard } from '../../components/SkeletonCard'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { useDebounce } from '../../hooks/useDebounce'
import { useBuyerListings } from '../../hooks/useListings'
import { useProfile } from '../../hooks/useProfile'
import { getBuyerSearchAssist } from '../../services/aiService'
import type { BuyerSearchAssistResult, ListingFilters } from '../../types/app'
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

export default function FeedScreen() {
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<ListingFilters>({})
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isAiSearchLoading, setIsAiSearchLoading] = useState(false)
  const [aiSearchResult, setAiSearchResult] =
    useState<BuyerSearchAssistResult | null>(null)
  const debouncedQuery = useDebounce(query)
  const { data, isLoading, isFetchingMore, loadMore } = useBuyerListings({
    ...filters,
    search: debouncedQuery.trim() || undefined,
  })

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

  const handleAiSearch = async () => {
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
    showToast('AI filters applied. You can still adjust them manually.', 'success')
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.headerShell}>
          <View style={styles.identityRow}>
            {profile?.avatar_url ? (
              <Pressable onPress={() => router.push('/(shared)/profile')}>
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.push('/(shared)/profile')}
                style={styles.avatarFallback}
              >
                <Text style={styles.avatarText}>
                  {getInitials(profile?.full_name, user?.email ?? 'B')}
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => router.push('/(shared)/profile')}
              style={styles.identityText}
            >
              <Text style={styles.identityTitle}>{profile?.full_name ?? 'Buyer'}</Text>
              <Text style={styles.identityMeta}>
                {profile?.email ?? user?.email ?? 'No email'}
              </Text>
            </Pressable>

            <View style={styles.iconActions}>
              <Pressable
                accessibilityLabel="Open map view"
                onPress={() => router.push('/(buyer)/map')}
                style={[styles.iconButton, styles.iconButtonPrimary]}
              >
                <Text style={styles.iconGlyph}>⌖</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Edit profile"
                onPress={() => router.push('/(shared)/profile')}
                style={styles.iconButton}
              >
                <Text style={styles.iconGlyph}>✎</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.quickNavRow}>
            <Pressable
              onPress={() => router.push('/(buyer)/dashboard')}
              style={styles.quickNavButton}
            >
              <Text style={styles.quickNavButtonText}>Dashboard</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(buyer)/requests')}
              style={styles.quickNavButton}
            >
              <Text style={styles.quickNavButtonText}>Requests</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(buyer)/map')}
              style={[styles.quickNavButton, styles.quickNavButtonAccent]}
            >
              <Text
                style={[
                  styles.quickNavButtonText,
                  styles.quickNavButtonTextAccent,
                ]}
              >
                Map
              </Text>
            </Pressable>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search listings, waste type, or city"
            placeholderTextColor="#9e9183"
            style={styles.search}
          />

          <View style={styles.filterRow}>
            <Pressable
              onPress={() => void handleAiSearch()}
              style={styles.aiSearchButton}
            >
              <Text style={styles.aiSearchButtonText}>
                {isAiSearchLoading ? 'Reading search...' : 'Search with AI'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setIsFilterOpen(true)}
              style={styles.filterButton}
            >
              <Text style={styles.filterGlyph}>≡</Text>
              <Text style={styles.filterButtonText}>
                {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
              </Text>
            </Pressable>
          </View>

          {aiSearchResult ? (
            <View style={styles.aiReviewCard}>
              <Text style={styles.aiReviewTitle}>AI interpreted your search</Text>
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
                  onPress={() => setAiSearchResult(null)}
                  style={styles.aiDismissButton}
                >
                  <Text style={styles.aiDismissButtonText}>Dismiss</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : data.length > 0 ? (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            onEndReached={loadMore}
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
                listing={item}
                onPress={() => router.push(`/(shared)/listing/${item.id}`)}
              />
            )}
          />
        ) : (
          <EmptyState
            title="No listings match your search"
            description="This is the feed empty state the plan calls for in the polish phase."
            actionLabel="Open map view"
            onAction={() => router.push('/(buyer)/map')}
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
    paddingBottom: 14,
    gap: 14,
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
  iconActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eef5ef',
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPrimary: {
    backgroundColor: '#e1eee4',
  },
  iconGlyph: {
    color: palette.sageDark,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 18,
  },
  search: {
    backgroundColor: palette.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: palette.ink,
  },
  quickNavRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickNavButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickNavButtonAccent: {
    backgroundColor: '#e4efe6',
    borderColor: 'rgba(58, 102, 72, 0.14)',
  },
  quickNavButtonText: {
    color: palette.clay,
    fontSize: 13,
    fontWeight: '800',
  },
  quickNavButtonTextAccent: {
    color: palette.sageDark,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  aiSearchButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#e4efe6',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  aiSearchButtonText: {
    color: palette.sageDark,
    fontWeight: '800',
    fontSize: 13,
  },
  filterButton: {
    alignSelf: 'flex-start',
    backgroundColor: palette.parchment,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButtonText: {
    color: palette.clay,
    fontWeight: '800',
    fontSize: 13,
  },
  filterGlyph: {
    color: palette.clay,
    fontSize: 16,
    lineHeight: 16,
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
