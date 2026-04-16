import { useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ContactRequestCard } from '../../components/ContactRequestCard'
import { EmptyState } from '../../components/EmptyState'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { getBuyerContactRequests } from '../../services/contactService'
import type { ContactRequestSummary } from '../../types/app'
import { palette, radii } from '../../utils/theme'

export default function BuyerDashboardScreen() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [requests, setRequests] = useState<ContactRequestSummary[]>([])

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

  useFocusEffect(
    useCallback(() => {
      void loadRequests()
    }, [loadRequests]),
  )

  const recentRequests = requests.slice(0, 3)

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>Buyer dashboard</Text>
          <Text style={styles.subtitle}>
            Sent requests are now tracked here. Recently viewed listings are still
            the remaining dashboard gap.
          </Text>
        </View>

        <EmptyState
          title="No recently viewed listings yet"
          description="Once a buyer opens listing details, the next step is to store those IDs locally and show them here."
          actionLabel="Browse the feed"
          onAction={() => router.push('/(buyer)/feed')}
        />

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
  hero: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 24,
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
