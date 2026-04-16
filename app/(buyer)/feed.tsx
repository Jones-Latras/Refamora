import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '../../components/EmptyState'
import { ListingCard } from '../../components/ListingCard'
import { SkeletonCard } from '../../components/SkeletonCard'
import { useDebounce } from '../../hooks/useDebounce'
import { useBuyerListings } from '../../hooks/useListings'
import { palette, radii } from '../../utils/theme'

export default function FeedScreen() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query)
  const { data, isLoading } = useBuyerListings()

  const filteredListings = useMemo(() => {
    const normalized = debouncedQuery.trim().toLowerCase()

    if (!normalized) {
      return data ?? []
    }

    return (data ?? []).filter((listing) =>
      `${listing.title} ${listing.city} ${listing.wasteType}`
        .toLowerCase()
        .includes(normalized),
    )
  }, [data, debouncedQuery])

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>Browse available waste listings</Text>
          <Text style={styles.subtitle}>
            Search and filter hooks are wired so later feed pagination can slot
            in without replacing the screen structure.
          </Text>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search waste type or city"
          placeholderTextColor="#9e9183"
          style={styles.search}
        />

        {isLoading ? (
          <View style={styles.loading}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : filteredListings.length > 0 ? (
          <FlatList
            data={filteredListings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
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
  hero: {
    gap: 8,
  },
  title: {
    color: palette.soil,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.muted,
    lineHeight: 22,
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
  loading: {
    gap: 16,
  },
  list: {
    gap: 16,
    paddingBottom: 24,
  },
})
