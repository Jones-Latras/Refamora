import { useFocusEffect } from '@react-navigation/native'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '../../../components/EmptyState'
import { ErrorState } from '../../../components/ErrorState'
import { useToast } from '../../../components/Toast'
import { useAuth } from '../../../hooks/useAuth'
import { getReplyDraft } from '../../../services/aiService'
import {
  getContactConversation,
  markInquirySeen,
  sendContactRequestMessage,
} from '../../../services/contactService'
import type { ContactConversation } from '../../../types/app'
import { formatDateTime } from '../../../utils/formatters'
import { palette, radii, shadow } from '../../../utils/theme'

export default function ContactConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const scrollViewRef = useRef<ScrollView>(null)
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const [conversation, setConversation] = useState<ContactConversation | null>(null)
  const [composerValue, setComposerValue] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isDraftLoading, setIsDraftLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadConversation = useCallback(async () => {
    if (!user || !id) {
      setConversation(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)
    const result = await getContactConversation(id, user.id)

    if (result.error || !result.data) {
      setConversation(null)
      setLoadError(result.error?.message ?? 'Conversation could not be loaded right now.')
      setIsLoading(false)
      return
    }

    setConversation(result.data)
    setIsLoading(false)

    if (role === 'farmer' && result.data.request.status === 'pending') {
      const seenResult = await markInquirySeen(result.data.request.id, user.id)

      if (!seenResult.error) {
        setConversation((current) =>
          current
            ? {
                ...current,
                request: {
                  ...current.request,
                  status: 'seen',
                },
              }
            : current,
        )
      }
    }
  }, [id, role, user])

  useFocusEffect(
    useCallback(() => {
      void loadConversation()
    }, [loadConversation]),
  )
  const messageCount = conversation?.messages.length ?? 0

  useEffect(() => {
    if (!conversation) {
      return
    }

    const timeoutId = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 60)

    return () => clearTimeout(timeoutId)
  }, [conversation, messageCount])

  const counterpartLabel = useMemo(() => {
    if (!conversation) {
      return ''
    }

    return role === 'farmer' ? 'Buyer' : 'Seller'
  }, [conversation, role])
  const canUseAiDraft = role === 'farmer'

  const handleSend = async () => {
    if (!user || !conversation || isSending) {
      return
    }

    const trimmedMessage = composerValue.trim()

    if (!trimmedMessage) {
      showToast('Write a message before sending it.', 'error')
      return
    }

    setIsSending(true)
    const result = await sendContactRequestMessage({
      request_id: conversation.request.id,
      sender_id: user.id,
      message: trimmedMessage,
    })
    setIsSending(false)

    if (result.error || !result.data) {
      showToast(result.error?.message ?? 'Message could not be sent right now.', 'error')
      return
    }

    setComposerValue('')
    setConversation((current) => {
      if (!current) {
        return current
      }

      const isSellerMessage = user.id === current.request.sellerId

      return {
        request: {
          ...current.request,
          message: result.data.message,
          messageCount: current.request.messageCount + 1,
          lastMessageSenderId: result.data.sender_id,
          status: isSellerMessage ? 'responded' : 'pending',
          updatedAt: result.data.created_at,
        },
        messages: [
          ...current.messages,
          {
            id: result.data.id,
            requestId: result.data.request_id,
            senderId: result.data.sender_id,
            message: result.data.message,
            createdAt: result.data.created_at,
          },
        ],
      }
    })
    showToast(role === 'farmer' ? 'Reply sent.' : 'Message sent.', 'success')
  }

  const handleGenerateDraft = async () => {
    if (!conversation || isDraftLoading) {
      return
    }

    const latestBuyerMessage = [...conversation.messages]
      .reverse()
      .find((message) => message.senderId === conversation.request.buyerId)

    setIsDraftLoading(true)

    try {
      const result = await getReplyDraft({
        inquiry: {
          id: conversation.request.id,
          listingTitle: conversation.request.listingTitle,
          counterpartName: conversation.request.counterpartName,
          counterpartCity: conversation.request.counterpartCity,
          message: latestBuyerMessage?.message ?? conversation.request.message,
          status: conversation.request.status,
          createdAt: latestBuyerMessage?.createdAt ?? conversation.request.updatedAt,
        },
      })

      if (result.error || !result.data) {
        showToast(result.error?.message ?? 'Reply draft is unavailable right now.', 'error')
        return
      }

      setComposerValue(result.data.result.draftReply)
      showToast('AI draft added to the message box. Edit it before sending.', 'success')
    } finally {
      setIsDraftLoading(false)
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={palette.sageDark} size="small" />
          <Text style={styles.helperText}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (loadError && !conversation) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.stateWrapper}>
          <ErrorState
            title="Conversation unavailable"
            description={loadError}
            onAction={() => {
              void loadConversation()
            }}
          />
        </View>
      </SafeAreaView>
    )
  }

  if (!conversation) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.stateWrapper}>
          <EmptyState
            title="Conversation not found"
            description="This request thread is unavailable or you no longer have access to it."
            actionLabel="Back"
            onAction={() => {
              if (router.canGoBack()) {
                router.back()
                return
              }

              router.replace(role === 'farmer' ? '/(farmer)/requests' : '/(buyer)/requests')
            }}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.screen}>
          <View style={styles.headerCard}>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{conversation.request.listingTitle}</Text>
              <Text style={styles.headerSubtitle}>
                {counterpartLabel}: {conversation.request.counterpartName}
              </Text>
              <Text style={styles.headerMeta}>
                Last activity {formatDateTime(conversation.request.updatedAt)}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push(`/(shared)/listing/${conversation.request.listingId}`)}
              style={styles.listingLink}
            >
              <Text style={styles.listingLinkText}>Open listing</Text>
            </Pressable>
          </View>

          {conversation.request.counterpartPhone ? (
            <View style={styles.phoneCard}>
              <Text style={styles.phoneLabel}>Contact number</Text>
              <Text style={styles.phoneValue}>{conversation.request.counterpartPhone}</Text>
            </View>
          ) : null}

          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messageList}
            keyboardShouldPersistTaps="handled"
          >
            {conversation.messages.length > 0 ? (
              conversation.messages.map((message) => {
                const isOwnMessage = message.senderId === user?.id

                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageRow,
                      isOwnMessage ? styles.ownMessageRow : styles.otherMessageRow,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          isOwnMessage ? styles.ownMessageText : null,
                        ]}
                      >
                        {message.message}
                      </Text>
                    </View>
                    <Text style={styles.messageTime}>{formatDateTime(message.createdAt)}</Text>
                  </View>
                )
              })
            ) : (
              <View style={styles.emptyMessagesCard}>
                <Text style={styles.emptyMessagesTitle}>No messages yet</Text>
                <Text style={styles.emptyMessagesText}>
                  Start the conversation here. New messages from both buyer and seller will stay
                  in this thread.
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.composerCard}>
            {canUseAiDraft ? (
              <Pressable
                disabled={isDraftLoading}
                onPress={() => void handleGenerateDraft()}
                style={[styles.draftButton, isDraftLoading ? styles.disabledButton : null]}
              >
                <Text style={styles.draftButtonText}>
                  {isDraftLoading ? 'Drafting...' : 'AI draft'}
                </Text>
              </Pressable>
            ) : null}

            <TextInput
              multiline
              numberOfLines={4}
              editable={!isSending}
              placeholder={
                role === 'farmer'
                  ? 'Write your reply to the buyer.'
                  : 'Write a follow-up message to the seller.'
              }
              placeholderTextColor="#9c8c79"
              style={styles.composerInput}
              textAlignVertical="top"
              value={composerValue}
              onChangeText={setComposerValue}
            />

            <Pressable
              disabled={isSending}
              onPress={() => void handleSend()}
              style={[styles.sendButton, isSending ? styles.disabledButton : null]}
            >
              <Text style={styles.sendButtonText}>
                {isSending ? 'Sending...' : role === 'farmer' ? 'Send reply' : 'Send message'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  helperText: {
    color: palette.muted,
  },
  stateWrapper: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 12,
    ...shadow,
  },
  headerText: {
    gap: 4,
  },
  headerTitle: {
    color: palette.soil,
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: palette.clay,
    fontSize: 14,
    fontWeight: '700',
  },
  headerMeta: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  listingLink: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#eef6ed',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  listingLinkText: {
    color: palette.sageDark,
    fontSize: 12,
    fontWeight: '800',
  },
  phoneCard: {
    backgroundColor: '#f6f8f5',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  phoneLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  phoneValue: {
    color: palette.soil,
    fontSize: 15,
    fontWeight: '800',
  },
  messageList: {
    gap: 12,
    paddingBottom: 6,
  },
  messageRow: {
    gap: 6,
  },
  ownMessageRow: {
    alignItems: 'flex-end',
  },
  otherMessageRow: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '86%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ownMessageBubble: {
    backgroundColor: palette.sage,
    borderBottomRightRadius: 6,
  },
  otherMessageBubble: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderBottomLeftRadius: 6,
  },
  messageText: {
    color: palette.ink,
    lineHeight: 21,
  },
  ownMessageText: {
    color: palette.cream,
  },
  messageTime: {
    color: palette.muted,
    fontSize: 11,
    paddingHorizontal: 4,
  },
  emptyMessagesCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 6,
  },
  emptyMessagesTitle: {
    color: palette.soil,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyMessagesText: {
    color: palette.muted,
    lineHeight: 20,
  },
  composerCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 12,
    ...shadow,
  },
  draftButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#eef6ed',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  draftButtonText: {
    color: palette.sageDark,
    fontSize: 12,
    fontWeight: '800',
  },
  composerInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.ink,
    backgroundColor: '#fffcf6',
  },
  sendButton: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: palette.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: palette.cream,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.72,
  },
})
