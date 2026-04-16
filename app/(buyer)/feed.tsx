import { router } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
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
import { useDebounce } from '../../hooks/useDebounce'
import { useBuyerListings } from '../../hooks/useListings'
import type { ListingFilters } from '../../types/app'
import { palette, radii } from '../../utils/theme'

export default function FeedScreen() {
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
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <View style={styles.content}>
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
            <Text style={styles.filterButtonText}>
              {activeFilterCount > 0
                ? `Filters (${activeFilterCount})`
                : 'Filters'}
            </Text>
          </Pressable>
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
    padding: 24,
    gap: 16,
  },
  search: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: palette.ink,
  },
  filterRow: {
    gap: 8,
  },
  filterButton: {
    alignSelf: 'flex-start',
    backgroundColor: palette.parchment,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButtonText: {
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
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
})
