import { Image, Pressable, StyleSheet, Text, View } from 'react-native'

import type { ContactRequestSummary } from '../types/app'

import { formatRelativeTime } from '../utils/formatters'
import { palette, radii } from '../utils/theme'

type ContactRequestCardProps = {
  request: ContactRequestSummary
  role: 'buyer' | 'seller'
  onPress: () => void
}

function getFallbackLabel(request: ContactRequestSummary) {
  const source = request.listingTitle.trim() || request.counterpartName.trim()
  return source.charAt(0).toUpperCase() || 'R'
}

function getPreviewPrefix(request: ContactRequestSummary, role: 'buyer' | 'seller') {
  const ownSenderId = role === 'buyer' ? request.buyerId : request.sellerId

  if (request.lastMessageSenderId === ownSenderId) {
    return 'You: '
  }

  return ''
}

function getPreviewText(request: ContactRequestSummary, role: 'buyer' | 'seller') {
  if (!request.message) {
    return role === 'buyer'
      ? 'Conversation started. Send a follow-up if you still need this listing.'
      : 'Buyer inquiry started. Open the chat to reply.'
  }

  return `${getPreviewPrefix(request, role)}${request.message}`
}

function getAttentionState(
  request: ContactRequestSummary,
  role: 'buyer' | 'seller',
): { showDot: boolean; badgeLabel: string | null } {
  if (role === 'seller') {
    return {
      showDot: request.status === 'pending',
      badgeLabel: request.status === 'pending' ? 'Unread' : null,
    }
  }

  const sellerSentLatest =
    request.status === 'responded' && request.lastMessageSenderId === request.sellerId

  return {
    showDot: sellerSentLatest,
    badgeLabel: sellerSentLatest ? 'Reply' : null,
  }
}

export function ContactRequestCard({
  request,
  role,
  onPress,
}: ContactRequestCardProps) {
  const attentionState = getAttentionState(request, role)

  return (
    <Pressable onPress={onPress} style={styles.row}>
      {request.listingImageUrl ? (
        <Image source={{ uri: request.listingImageUrl }} style={styles.thumbnail} />
      ) : request.counterpartAvatarUrl ? (
        <Image source={{ uri: request.counterpartAvatarUrl }} style={styles.thumbnail} />
      ) : (
        <View style={styles.fallbackThumb}>
          <Text style={styles.fallbackThumbText}>{getFallbackLabel(request)}</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.topLine}>
          <Text numberOfLines={1} style={styles.title}>
            {request.listingTitle}
          </Text>
          <Text style={styles.time}>{formatRelativeTime(request.updatedAt)}</Text>
        </View>

        <Text numberOfLines={1} style={styles.subtitle}>
          {request.counterpartName}
          {request.counterpartCity ? ` | ${request.counterpartCity}` : ''}
        </Text>

        <Text numberOfLines={1} style={styles.preview}>
          {getPreviewText(request, role)}
        </Text>
      </View>

      <View style={styles.trailing}>
        {attentionState.badgeLabel ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{attentionState.badgeLabel}</Text>
          </View>
        ) : null}
        {attentionState.showDot ? <View style={styles.dot} /> : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  thumbnail: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#d8e1d5',
  },
  fallbackThumb: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#e5eee4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackThumbText: {
    color: palette.sageDark,
    fontSize: 18,
    fontWeight: '900',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    color: palette.soil,
    fontSize: 15,
    fontWeight: '800',
  },
  time: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  preview: {
    color: palette.ink,
    fontSize: 13,
    lineHeight: 18,
  },
  trailing: {
    minWidth: 48,
    alignItems: 'flex-end',
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: '#eef6ed',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    color: palette.sageDark,
    fontSize: 11,
    fontWeight: '800',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radii.sm,
    backgroundColor: palette.sage,
  },
})
