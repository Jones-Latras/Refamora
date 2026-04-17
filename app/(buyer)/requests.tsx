import { router } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ContactRequestCard } from '../../components/ContactRequestCard'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { getBuyerContactRequests } from '../../services/contactService'
import type { ContactRequestSummary } from '../../types/app'
import { palette } from '../../utils/theme'

export default function BuyerRequestsScreen() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [requests, setRequests] = useState<ContactRequestSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    if (!user) {
      setRequests([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)
    const result = await getBuyerContactRequests(user.id)

    if (result.error) {
      showToast(result.error.message, 'error')
      setRequests([])
      setLoadError('Buyer requests could not be loaded right now.')
      setIsLoading(false)
      return
    }

    setRequests(result.data ?? [])
    setIsLoading(false)
  }, [showToast, user])

  useFocusEffect(
    useCallback(() => {
      void loadRequests()
    }, [loadRequests]),
  )

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.helper}>Loading sent requests...</Text>
        </View>
      ) : requests.length > 0 ? (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <ContactRequestCard request={item} role="buyer" />}
        />
      ) : loadError ? (
        <View style={styles.list}>
          <ErrorState
            title="Requests could not be loaded"
            description="Refamora could not refresh your sent requests right now. Try again to load them."
            onAction={() => {
              void loadRequests()
            }}
          />
        </View>
      ) : (
        <View style={styles.list}>
          <EmptyState
            title="No contact requests yet"
            description="Once you contact a seller, this screen will track the request status and show any phone number unlocked after the inquiry."
            actionLabel="Browse listings"
            onAction={() => router.push('/(buyer)/feed')}
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
