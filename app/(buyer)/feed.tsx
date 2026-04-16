import { router } from 'expo-router'
import { useState } from 'react'
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
import { useAuth } from '../../hooks/useAuth'
import { useDebounce } from '../../hooks/useDebounce'
import { useBuyerListings } from '../../hooks/useListings'
import { useProfile } from '../../hooks/useProfile'
import type { ListingFilters } from '../../types/app'
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

export default function FeedScreen() {
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<ListingFilters>({})
  const [isFilterOpen, setIsFilterOpen] = useState(false)
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

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search listings, waste type, or city"
            placeholderTextColor="#9e9183"
            style={styles.search}
          />

          <View style={styles.filterRow}>
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
  filterRow: {
    gap: 8,
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
