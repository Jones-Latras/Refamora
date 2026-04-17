import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ContactRequestCard } from '../../components/ContactRequestCard'
import { EmptyState } from '../../components/EmptyState'
import { InquiryAiModal } from '../../components/InquiryAiModal'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import {
  getSellerInquiries,
  markSellerInquiriesSeen,
} from '../../services/contactService'
import {
  getInquirySummary,
  getReplyDraft,
} from '../../services/aiService'
import type {
  ContactRequestSummary,
  InquiryAssistItem,
  InquirySummaryResult,
  ReplyDraftResult,
} from '../../types/app'
import { palette, radii } from '../../utils/theme'

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

export default function FarmerRequestsScreen() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [requests, setRequests] = useState<ContactRequestSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const [isReplyLoading, setIsReplyLoading] = useState(false)
  const [summaryResult, setSummaryResult] = useState<InquirySummaryResult | null>(null)
  const [replyResult, setReplyResult] = useState<ReplyDraftResult | null>(null)
  const [editableReply, setEditableReply] = useState('')
  const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false)
  const [isReplyModalVisible, setIsReplyModalVisible] = useState(false)

  const loadRequests = useCallback(async () => {
    if (!user) {
      setRequests([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const result = await getSellerInquiries(user.id)

    if (result.error) {
      showToast(result.error.message, 'error')
      setRequests([])
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
    showToast('Inquiries marked as seen.', 'success')
  }

  const handleSummarize = async () => {
    if (requests.length === 0) {
      showToast('No inquiries to summarize yet.', 'info')
      return
    }

    setIsSummaryLoading(true)

    try {
      const result = await getInquirySummary({
        inquiries: requests.map(toInquiryAssistItem),
      })

      if (result.error || !result.data) {
        showToast(result.error?.message ?? 'Inquiry summary is unavailable right now.', 'error')
        return
      }

      setSummaryResult(result.data)
      setIsSummaryModalVisible(true)
    } finally {
      setIsSummaryLoading(false)
    }
  }

  const handleDraftReply = async (request: ContactRequestSummary) => {
    setIsReplyLoading(true)

    try {
      const result = await getReplyDraft({
        inquiry: toInquiryAssistItem(request),
      })

      if (result.error || !result.data) {
        showToast(result.error?.message ?? 'Reply draft is unavailable right now.', 'error')
        return
      }

      setReplyResult(result.data)
      setEditableReply(result.data.result.draftReply)
      setIsReplyModalVisible(true)
    } finally {
      setIsReplyLoading(false)
    }
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <View style={styles.headerCard}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>Seller inquiry inbox</Text>
          <Text style={styles.subtitle}>
            Review buyer questions, see what still needs attention, and use AI to
            draft replies.
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            disabled={isSummaryLoading}
            onPress={handleSummarize}
            style={[styles.primaryAction, isSummaryLoading ? styles.disabledButton : null]}
          >
            <Text style={styles.primaryActionText}>
              {isSummaryLoading ? 'Summarizing...' : 'Summarize inquiries'}
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
        <View style={styles.center}>
          <Text style={styles.helper}>Loading buyer inquiries...</Text>
        </View>
      ) : requests.length > 0 ? (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ContactRequestCard
              request={item}
              role="seller"
              actionLabel={isReplyLoading ? 'Generating reply...' : 'Draft reply'}
              onActionPress={() => void handleDraftReply(item)}
            />
          )}
        />
      ) : (
        <View style={styles.list}>
          <EmptyState
            title="No buyer inquiries yet"
            description="Buyer questions and contact requests will appear here once someone reaches out about your listings."
          />
        </View>
      )}

      <InquiryAiModal
        isVisible={isSummaryModalVisible}
        title="AI inquiry summary"
        subtitle="A quick overview of what needs your attention first."
        body={summaryResult?.result.summary ?? ''}
        bullets={[
          ...(summaryResult?.result.unansweredQuestions ?? []),
          ...(summaryResult?.result.followUpTips ?? []),
        ]}
        onClose={() => setIsSummaryModalVisible(false)}
      />

      <InquiryAiModal
        isVisible={isReplyModalVisible}
        title="AI reply draft"
        subtitle="Edit this before sending it through your preferred channel."
        body={editableReply}
        editable
        onChangeBody={setEditableReply}
        bullets={[
          ...(replyResult?.result.unansweredQuestions ?? []),
          ...(replyResult?.result.keyPoints ?? []),
        ]}
        onClose={() => setIsReplyModalVisible(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  headerCard: {
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#eef6ed',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
    padding: 16,
    gap: 14,
  },
  headerTextBlock: {
    gap: 4,
  },
  title: {
    color: palette.sageDark,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: '#5f7166',
    lineHeight: 20,
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
