import { Feather } from '@expo/vector-icons'
import { useHeaderHeight } from '@react-navigation/elements'
import { useFocusEffect } from '@react-navigation/native'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

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

function getHeaderFallbackLabel(conversation: ContactConversation) {
  const source =
    conversation.request.listingTitle.trim() ||
    conversation.request.counterpartName.trim()

  return source.charAt(0).toUpperCase() || 'R'
}

export default function ContactConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const scrollViewRef = useRef<ScrollView>(null)
  const headerHeight = useHeaderHeight()
  const insets = useSafeAreaInsets()
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

  const counterpartRoleLabel = useMemo(
    () => (role === 'farmer' ? 'Buyer' : 'Seller'),
    [role],
  )
  const canUseAiDraft = role === 'farmer'
  const keyboardVerticalOffset = Platform.OS === 'ios' ? headerHeight : 0
  const composerPaddingBottom = Math.max(insets.bottom, 14)

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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={styles.flex}
      >
        <View style={styles.screen}>
          <View style={styles.headerCard}>
            <View style={styles.headerMain}>
              {conversation.request.listingImageUrl ? (
                <Image
                  source={{ uri: conversation.request.listingImageUrl }}
                  style={styles.headerThumb}
                />
              ) : conversation.request.counterpartAvatarUrl ? (
                <Image
                  source={{ uri: conversation.request.counterpartAvatarUrl }}
                  style={styles.headerThumb}
                />
              ) : (
                <View style={styles.headerFallbackThumb}>
                  <Text style={styles.headerFallbackText}>
                    {getHeaderFallbackLabel(conversation)}
                  </Text>
                </View>
              )}

              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>{conversation.request.listingTitle}</Text>
                <Text style={styles.headerSubtitle}>
                  {conversation.request.counterpartName}
                </Text>
                <Text style={styles.headerMeta}>
                  {counterpartRoleLabel}
                  {conversation.request.counterpartCity
                    ? ` | ${conversation.request.counterpartCity}`
                    : ''}
                  {` | Last activity ${formatDateTime(conversation.request.updatedAt)}`}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.push(`/(shared)/listing/${conversation.request.listingId}`)}
              style={[styles.listingLink, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
            >
              <Feather name="external-link" size={12} color={palette.sageDark} />
              <Text style={styles.listingLinkText}>Open listing</Text>
            </Pressable>
          </View>

          {conversation.request.counterpartPhone ? (
            <View style={[styles.phoneCard, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
              <Feather name="phone" size={16} color={palette.sageDark} />
              <View style={{ gap: 2 }}>
                <Text style={styles.phoneLabel}>Contact number</Text>
                <Text style={styles.phoneValue}>{conversation.request.counterpartPhone}</Text>
              </View>
            </View>
          ) : null}

          <ScrollView
            ref={scrollViewRef}
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            contentContainerStyle={styles.messageList}
            keyboardShouldPersistTaps="handled"
            style={styles.messageScroll}
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
                <Feather name="message-circle" size={24} color={palette.muted} style={{ marginBottom: 4 }} />
                <Text style={styles.emptyMessagesTitle}>No messages yet</Text>
                <Text style={styles.emptyMessagesText}>
                  Start the conversation here. New messages from both buyer and seller will stay
                  in this thread.
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.composerCard, { paddingBottom: composerPaddingBottom }]}>
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

            <View style={styles.composerRow}>
              <View style={styles.composerInputShell}>
                <TextInput
                  multiline
                  numberOfLines={3}
                  editable={!isSending}
                  placeholder={
                    role === 'farmer'
                      ? 'Write your reply to the buyer.'
                      : 'Write a follow-up message to the seller.'
                  }
                  placeholderTextColor="#9c8c79"
                  style={styles.composerInput}
                  textAlignVertical="center"
                  value={composerValue}
                  onChangeText={setComposerValue}
                />
              </View>

              <Pressable
                disabled={isSending}
                onPress={() => void handleSend()}
                style={[styles.sendButton, isSending ? styles.disabledButton : null]}
              >
                <Text style={styles.sendButtonText}>
                  {isSending ? '...' : '>'}
                </Text>
              </Pressable>
            </View>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
  },
  messageScroll: {
    flex: 1,
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
    padding: 12,
    gap: 8,
    ...shadow,
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerThumb: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#d8e1d5',
  },
  headerFallbackThumb: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#e5eee4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerFallbackText: {
    color: palette.sageDark,
    fontSize: 18,
    fontWeight: '900',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: palette.soil,
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: palette.clay,
    fontSize: 13,
    fontWeight: '700',
  },
  headerMeta: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 16,
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
    flexGrow: 1,
    justifyContent: 'flex-end',
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
    gap: 10,
    paddingTop: 6,
  },
  draftButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#eef6ed',
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  draftButtonText: {
    color: palette.sageDark,
    fontSize: 12,
    fontWeight: '800',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  composerInputShell: {
    flex: 1,
    minHeight: 54,
    maxHeight: 116,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#fffdf9',
    paddingHorizontal: 16,
    paddingVertical: 2,
    ...shadow,
  },
  composerInput: {
    minHeight: 50,
    maxHeight: 108,
    paddingVertical: 12,
    color: palette.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.sage,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    ...shadow,
  },
  sendButtonText: {
    color: palette.cream,
    fontWeight: '900',
    fontSize: 20,
    lineHeight: 20,
  },
  disabledButton: {
    opacity: 0.72,
  },
})
