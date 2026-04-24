import { useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ContactRequestCard } from '../../components/ContactRequestCard'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { useConnectivity } from '../../hooks/useConnectivity'
import { useOfflineDataStore } from '../../hooks/useOfflineData'
import { getBuyerContactRequests } from '../../services/contactService'
import type { ContactRequestSummary } from '../../types/app'
import {
  formatOfflineSnapshotUpdatedAt,
  shouldUseOfflineSnapshot,
} from '../../utils/offlineData'
import { palette } from '../../utils/theme'

type BuyerMessageFilter = 'all' | 'replies' | 'sent'

const FILTER_OPTIONS: { key: BuyerMessageFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'replies', label: 'Replies' },
  { key: 'sent', label: 'You sent' },
]

function matchesQuery(request: ContactRequestSummary, query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return [
    request.listingTitle,
    request.counterpartName,
    request.counterpartCity,
    request.message,
  ]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalizedQuery))
}

export default function BuyerRequestsScreen() {
  const { user } = useAuth()
  const { isOffline } = useConnectivity()
  const { showToast } = useToast()
  const cachedBuyerRequests = useOfflineDataStore((state) =>
    user?.id
      ? state.buyerRequestsByUser[user.id] ?? { items: [], updatedAt: null }
      : { items: [], updatedAt: null },
  )
  const setCachedBuyerRequests = useOfflineDataStore((state) => state.setBuyerRequests)
  const [requests, setRequests] = useState<ContactRequestSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [activeFilter, setActiveFilter] = useState<BuyerMessageFilter>('all')

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
      setLoadError('Buyer messages could not be loaded right now.')
      setIsLoading(false)
      return
    }

    setRequests(result.data ?? [])
    setCachedBuyerRequests(user.id, result.data ?? [])
    setIsLoading(false)
  }, [setCachedBuyerRequests, showToast, user])

  useFocusEffect(
    useCallback(() => {
      void loadRequests()
    }, [loadRequests]),
  )

  const isUsingCachedRequests = shouldUseOfflineSnapshot({
    isOffline,
    liveItemCount: requests.length,
    snapshotItemCount: cachedBuyerRequests.items.length,
  })
  const effectiveRequests = isUsingCachedRequests ? cachedBuyerRequests.items : requests
  const cachedRequestsUpdatedAt = useMemo(
    () => formatOfflineSnapshotUpdatedAt(cachedBuyerRequests.updatedAt),
    [cachedBuyerRequests.updatedAt],
  )

  const filteredRequests = useMemo(() => {
    return effectiveRequests.filter((request) => {
      if (!matchesQuery(request, searchValue)) {
        return false
      }

      if (activeFilter === 'replies') {
        return (
          request.status === 'responded' &&
          request.lastMessageSenderId === request.sellerId
        )
      }

      if (activeFilter === 'sent') {
        return request.lastMessageSenderId === request.buyerId
      }

      return true
    })
  }, [activeFilter, effectiveRequests, searchValue])

  const hasSearch = searchValue.trim().length > 0

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>
          Conversations about listings you contacted. Tap any row to continue the chat.
        </Text>

        <TextInput
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder="Search by product, seller, or keyword"
          placeholderTextColor="#9c8c79"
          style={styles.searchInput}
        />

        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => setActiveFilter(option.key)}
              style={[
                styles.filterChip,
                activeFilter === option.key ? styles.filterChipActive : null,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === option.key ? styles.filterChipTextActive : null,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {isUsingCachedRequests ? (
          <View style={styles.cachedNotice}>
            <Text style={styles.cachedNoticeTitle}>Showing cached inbox</Text>
            <Text style={styles.cachedNoticeText}>
              {cachedRequestsUpdatedAt
                ? `Last updated ${cachedRequestsUpdatedAt}. Reconnect to refresh seller replies.`
                : 'Reconnect to refresh seller replies.'}
            </Text>
          </View>
        ) : null}
      </View>

      {isLoading && !isUsingCachedRequests ? (
        <View style={styles.center}>
          <Text style={styles.helper}>Loading messages...</Text>
        </View>
      ) : loadError && effectiveRequests.length === 0 ? (
        <View style={styles.content}>
          <ErrorState
            title="Messages could not be loaded"
            description="Refamora could not refresh your seller conversations right now. Try again to reload the inbox."
            onAction={() => {
              void loadRequests()
            }}
          />
        </View>
      ) : filteredRequests.length > 0 ? (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <ContactRequestCard
              request={item}
              role="buyer"
              onPress={() => router.push(`/(shared)/conversation/${item.id}`)}
            />
          )}
        />
      ) : (
        <View style={styles.content}>
          <EmptyState
            title={hasSearch ? 'No messages match that search' : 'No messages yet'}
            description={
              hasSearch
                ? 'Try a different product name, seller name, or message keyword.'
                : 'Once you contact a seller, the conversation will appear here like a normal message thread.'
            }
            actionLabel={hasSearch ? 'Clear search' : 'Browse listings'}
            onAction={() => {
              if (hasSearch) {
                setSearchValue('')
                setActiveFilter('all')
                return
              }

              router.push('/(buyer)/feed')
            }}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
  },
  title: {
    color: palette.soil,
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: palette.muted,
    lineHeight: 20,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 999,
    backgroundColor: palette.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: palette.ink,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cachedNotice: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(176, 126, 40, 0.18)',
    backgroundColor: '#fff7ea',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  cachedNoticeTitle: {
    color: palette.soil,
    fontSize: 13,
    fontWeight: '800',
  },
  cachedNoticeText: {
    color: palette.clay,
    fontSize: 12,
    lineHeight: 17,
  },
  filterChip: {
    borderRadius: 999,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: '#e8f1eb',
    borderColor: '#c7dccd',
  },
  filterChipText: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: palette.sageDark,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helper: {
    color: palette.muted,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  separator: {
    height: 1,
    backgroundColor: palette.border,
    marginLeft: 66,
  },
})
