import { useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '../../../components/EmptyState'
import { getListingById } from '../../../services/listingService'
import type { Tables } from '../../../types/database'
import { formatPrice } from '../../../utils/formatters'
import { palette, radii } from '../../../utils/theme'

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [listing, setListing] = useState<Tables<'listings'> | null>(null)

  useEffect(() => {
    if (!id) {
      return
    }

    const loadListing = async () => {
      const result = await getListingById(id)
      setListing(result.data)
    }

    void loadListing()
  }, [id])

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {listing ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>{listing.waste_type}</Text>
              <Text style={styles.title}>{listing.title}</Text>
              <Text style={styles.price}>{formatPrice(listing.price, listing.unit)}</Text>
              <Text style={styles.meta}>
                {listing.city ?? 'Unknown city'} • {listing.quantity} {listing.unit}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this listing</Text>
              <Text style={styles.sectionText}>
                {listing.description ?? 'No description added yet.'}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fulfillment</Text>
              <Text style={styles.sectionText}>
                {listing.fulfillment_type} • status: {listing.status}
              </Text>
            </View>
          </>
        ) : (
          <EmptyState
            title="Listing not available"
            description="The detail route is in place, but this item is missing or has not been loaded from Supabase yet."
          />
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
    gap: 16,
  },
  hero: {
    backgroundColor: palette.soil,
    borderRadius: radii.lg,
    padding: 24,
    gap: 8,
  },
  eyebrow: {
    color: palette.harvest,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '700',
    fontSize: 11,
  },
  title: {
    color: palette.cream,
    fontSize: 30,
    fontWeight: '800',
  },
  price: {
    color: '#dfeadf',
    fontSize: 20,
    fontWeight: '800',
  },
  meta: {
    color: '#e8dfd1',
    lineHeight: 22,
  },
  section: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    gap: 8,
  },
  sectionTitle: {
    color: palette.soil,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionText: {
    color: palette.muted,
    lineHeight: 22,
  },
})
