import { router } from 'expo-router'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '../../components/EmptyState'
import { ListingCard } from '../../components/ListingCard'
import { useAuth } from '../../hooks/useAuth'
import { useFarmerListings } from '../../hooks/useListings'
import { palette } from '../../utils/theme'

export default function MyListingsScreen() {
  const { user } = useAuth()
  const { data, isLoading } = useFarmerListings(user?.id)

  return (
    <SafeAreaView style={styles.safeArea}>
      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.helper}>Loading your listings...</Text>
        </View>
      ) : data && data.length > 0 ? (
        <FlatList
          data={data}
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
        <View style={styles.list}>
          <EmptyState
            title="No listings yet"
            description="This matches the empty state called out later in the plan. Once you create a listing, it will show up here with its current status."
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
})
