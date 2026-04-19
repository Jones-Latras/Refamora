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
import { InquiryAiModal } from '../../components/InquiryAiModal'
import { RequestsScreenSkeleton } from '../../components/ScreenSkeleton'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { useUnreadMessages } from '../../hooks/useUnreadMessages'
import { getInquirySummary } from '../../services/aiService'
import {
  getSellerInquiries,
  markSellerInquiriesSeen,
} from '../../services/contactService'
import type {
  ContactRequestSummary,
  InquiryAssistItem,
  InquirySummaryResult,
} from '../../types/app'
import { palette } from '../../utils/theme'

type SellerMessageFilter = 'all' | 'unread' | 'replied'

const FILTER_OPTIONS: { key: SellerMessageFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'replied', label: 'Replied' },
]

function toInquiryAssistItem(request: ContactRequestSummary): InquiryAssistItem {
  return {
    id: request.id,
    listingTitle: request.listingTitle,
    counterpartName: request.counterpartName,
    counterpartCity: request.counterpartCity,
    message: request.message,
    status: request.status,
    createdAt: request.createdAt,
  }
}

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

export default function FarmerRequestsScreen() {
  const { user } = useAuth()
  const { refreshUnreadMessages } = useUnreadMessages()
  const { showToast } = useToast()
  const [requests, setRequests] = useState<ContactRequestSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const [summaryResult, setSummaryResult] = useState<InquirySummaryResult | null>(null)
  const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false)
  const [summaryTitle, setSummaryTitle] = useState('AI inbox summary')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [activeFilter, setActiveFilter] = useState<SellerMessageFilter>('all')

  const loadRequests = useCallback(async () => {
    if (!user) {
      setRequests([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)
    const result = await getSellerInquiries(user.id)

    if (result.error) {
      showToast(result.error.message, 'error')
      setRequests([])
      setLoadError('Seller messages could not be loaded right now.')
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

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === 'pending').length,
    [requests],
  )

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      if (!matchesQuery(request, searchValue)) {
        return false
      }

      if (activeFilter === 'unread') {
        return request.status === 'pending'
      }

      if (activeFilter === 'replied') {
        return request.lastMessageSenderId === request.sellerId
      }

      return true
    })
  }, [activeFilter, requests, searchValue])

  const handleMarkAllSeen = async () => {
    if (!user) {
      return
    }

    const result = await markSellerInquiriesSeen(user.id)

    if (result.error) {
      showToast(result.error.message, 'error')
      return
    }

    setRequests((current) =>
      current.map((item) => ({
        ...item,
        status: 'seen',
      })),
    )
    void refreshUnreadMessages()
    showToast('Messages marked as seen.', 'success')
  }

  const handleSummarize = async (
    scopedRequests?: ContactRequestSummary[] | null,
    title = 'AI inbox summary',
  ) => {
    const normalizedRequests = Array.isArray(scopedRequests) ? scopedRequests : filteredRequests

    if (normalizedRequests.length === 0) {
      showToast('No conversations to summarize yet.', 'info')
      return
    }

    setIsSummaryLoading(true)

    try {
      const result = await getInquirySummary({
        inquiries: normalizedRequests.map(toInquiryAssistItem),
      })

      if (result.error || !result.data) {
        showToast(result.error?.message ?? 'Inbox summary is unavailable right now.', 'error')
        return
      }

      setSummaryTitle(title)
      setSummaryResult(result.data)
      setIsSummaryModalVisible(true)
    } finally {
      setIsSummaryLoading(false)
    }
  }

  const hasSearch = searchValue.trim().length > 0

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={styles.title}>Messages</Text>
            {pendingCount > 0 ? (
              <View style={{ backgroundColor: palette.sage, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: palette.cream, fontSize: 12, fontWeight: '800' }}>
                  {pendingCount} new
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.subtitle}>
            Buyer conversations for your listings. Open a row to reply like a normal chat.
          </Text>
        </View>

        <TextInput
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder="Search by product, buyer, or keyword"
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

        <View style={styles.headerActions}>
          <Pressable
            disabled={isSummaryLoading}
            onPress={() => void handleSummarize()}
            style={[styles.primaryAction, isSummaryLoading ? styles.disabledButton : null]}
          >
            <Text style={styles.primaryActionText}>
              {isSummaryLoading ? 'Summarizing...' : 'Summarize visible'}
            </Text>
          </Pressable>
          {pendingCount > 0 ? (
            <Pressable onPress={() => void handleMarkAllSeen()} style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>Mark all seen</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <RequestsScreenSkeleton />
      ) : loadError && requests.length === 0 ? (
        <View style={styles.content}>
          <ErrorState
            title="Messages could not be loaded"
            description="Refamora could not refresh your buyer conversations right now. Try again to reload the inbox."
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
              role="seller"
              onPress={() => router.push(`/(shared)/conversation/${item.id}`)}
            />
          )}
        />
      ) : (
        <View style={styles.content}>
          <EmptyState
            title={hasSearch ? 'No messages match that search' : 'No buyer messages yet'}
            description={
              hasSearch
                ? 'Try another listing name, buyer name, or keyword.'
                : 'When a buyer contacts one of your listings, the conversation will appear here in your inbox.'
            }
            actionLabel={hasSearch ? 'Clear search' : 'Manage listings'}
            onAction={() => {
              if (hasSearch) {
                setSearchValue('')
                setActiveFilter('all')
                return
              }

              router.push('/(farmer)/my-listings')
            }}
          />
        </View>
      )}

      <InquiryAiModal
        isVisible={isSummaryModalVisible}
        title={summaryTitle}
        subtitle="A quick overview of the conversations that need attention first."
        body={summaryResult?.result.summary ?? ''}
        bullets={[
          ...(summaryResult?.result.unansweredQuestions ?? []),
          ...(summaryResult?.result.followUpTips ?? []),
        ]}
        onClose={() => setIsSummaryModalVisible(false)}
      />
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
  titleBlock: {
    gap: 4,
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
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: palette.sage,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryActionText: {
    color: palette.cream,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryActionText: {
    color: palette.clay,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.7,
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
