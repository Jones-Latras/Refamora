import { useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ContactRequestCard } from '../../components/ContactRequestCard'
import { EmptyState } from '../../components/EmptyState'
import { ListingCard } from '../../components/ListingCard'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import {
  getSellerInquiries,
  markSellerInquiriesSeen,
} from '../../services/contactService'
import { signOut } from '../../services/authService'
import { getFarmerListings } from '../../services/listingService'
import type { ContactRequestSummary, ListingPreview } from '../../types/app'
import { palette, radii } from '../../utils/theme'

export default function FarmerDashboardScreen() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [listings, setListings] = useState<ListingPreview[]>([])
  const [inquiries, setInquiries] = useState<ContactRequestSummary[]>([])

  const loadDashboard = useCallback(async () => {
    if (!user) {
      setListings([])
      setInquiries([])
      return
    }

    const [listingsResult, inquiriesResult] = await Promise.all([
      getFarmerListings(user.id),
      getSellerInquiries(user.id),
    ])

    if (listingsResult.error) {
      showToast(listingsResult.error.message, 'error')
    }

    if (inquiriesResult.error) {
      showToast(inquiriesResult.error.message, 'error')
    }

    setListings(listingsResult.data ?? [])
    setInquiries(inquiriesResult.data ?? [])
  }, [showToast, user])

  useFocusEffect(
    useCallback(() => {
      void loadDashboard()
    }, [loadDashboard]),
  )

  const handleSignOut = async () => {
    await signOut()
    router.replace('/(auth)/login')
  }

  const handleMarkAllSeen = async () => {
    if (!user) {
      return
    }

    const result = await markSellerInquiriesSeen(user.id)

    if (result.error) {
      showToast(result.error.message, 'error')
      return
    }

    setInquiries((current) =>
      current.map((item) => ({
        ...item,
        status: 'seen',
      })),
    )
    showToast('Inquiries marked as seen.', 'success')
  }

  const activeCount = useMemo(
    () => listings.filter((listing) => listing.status === 'active').length,
    [listings],
  )
  const soldCount = useMemo(
    () => listings.filter((listing) => listing.status === 'sold').length,
    [listings],
  )
  const pendingInquiryCount = useMemo(
    () => inquiries.filter((request) => request.status === 'pending').length,
    [inquiries],
  )

  const metrics = [
    { label: 'Active Listings', value: activeCount.toString() },
    { label: 'Sold', value: soldCount.toString() },
    { label: 'New Inquiries', value: pendingInquiryCount.toString() },
  ]

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.eyebrow}>Farmer tools</Text>
              <Text style={styles.title}>
                {user?.email ? `Welcome, ${user.email}` : 'Welcome back'}
              </Text>
            </View>
            <Pressable onPress={handleSignOut}>
              <Text style={styles.signOut}>Sign out</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            Listings, inquiry count, and recent buyer interest now load from
            Supabase instead of placeholders.
          </Text>
        </View>

        <View style={styles.metricRow}>
          {metrics.map((metric) => (
            <View key={metric.label} style={styles.metricCard}>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push('/(farmer)/create-listing')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Create a Listing</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(farmer)/my-listings')}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Manage Existing Listings</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(shared)/profile')}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Open My Profile</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent inquiries</Text>
              <Text style={styles.sectionSubtitle}>
                {pendingInquiryCount} pending request
                {pendingInquiryCount === 1 ? '' : 's'}
              </Text>
            </View>
            {pendingInquiryCount > 0 ? (
              <Pressable onPress={() => void handleMarkAllSeen()}>
                <Text style={styles.linkText}>Mark all seen</Text>
              </Pressable>
            ) : null}
          </View>

          {inquiries.length > 0 ? (
            <View style={styles.stack}>
              {inquiries.slice(0, 3).map((inquiry) => (
                <ContactRequestCard
                  key={inquiry.id}
                  request={inquiry}
                  role="seller"
                />
              ))}
            </View>
          ) : (
            <EmptyState
              title="No inquiries yet"
              description="When a buyer contacts you from a listing, the inquiry will appear here."
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent listings</Text>
          {listings.length > 0 ? (
            <View style={styles.stack}>
              {listings.slice(0, 3).map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onPress={() => router.push(`/(shared)/listing/${listing.id}`)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              title="Your recent listings will appear here"
              description="Create a listing and it will show up here with its current status."
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
    gap: 24,
  },
  hero: {
    backgroundColor: palette.soil,
    borderRadius: radii.lg,
    padding: 24,
    gap: 12,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  eyebrow: {
    color: palette.harvest,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  title: {
    color: palette.cream,
    fontWeight: '800',
    fontSize: 27,
    lineHeight: 33,
  },
  subtitle: {
    color: '#e8dfd1',
    lineHeight: 22,
  },
  signOut: {
    color: palette.harvest,
    fontWeight: '700',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    gap: 4,
  },
  metricValue: {
    color: palette.soil,
    fontSize: 28,
    fontWeight: '800',
  },
  metricLabel: {
    color: palette.muted,
    fontSize: 13,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: palette.sage,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 16,
  },
  primaryButtonText: {
    color: palette.cream,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#efe1c3',
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 16,
  },
  secondaryButtonText: {
    color: palette.clay,
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
