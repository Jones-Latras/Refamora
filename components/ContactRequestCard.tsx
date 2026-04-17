import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { ContactRequestSummary } from '../types/app'

import { formatDate } from '../utils/formatters'
import { palette, radii } from '../utils/theme'

type ContactRequestCardProps = {
  request: ContactRequestSummary
  role: 'buyer' | 'seller'
  actionLabel?: string
  onActionPress?: () => void
}

export function ContactRequestCard({
  request,
  role,
  actionLabel,
  onActionPress,
}: ContactRequestCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{request.listingTitle}</Text>
          <Text style={styles.meta}>
            {role === 'buyer' ? 'Seller' : 'Buyer'}: {request.counterpartName}
          </Text>
        </View>
        <View
          style={[
            styles.statusPill,
            request.status === 'pending' ? styles.pendingPill : styles.seenPill,
          ]}
        >
          <Text style={styles.statusText}>{request.status}</Text>
        </View>
      </View>

      <Text style={styles.meta}>
        {request.counterpartCity ?? 'Location not provided'} |{' '}
        {formatDate(request.createdAt)}
      </Text>

      {request.counterpartPhone ? (
        <Text style={styles.phone}>Phone: {request.counterpartPhone}</Text>
      ) : null}

      {request.message ? <Text style={styles.message}>{request.message}</Text> : null}

      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: palette.soil,
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    color: palette.muted,
    lineHeight: 20,
  },
  phone: {
    color: palette.clay,
    fontWeight: '700',
  },
  message: {
    color: palette.ink,
    lineHeight: 21,
  },
  actionButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#eef6ed',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
  },
  actionButtonText: {
    color: palette.sageDark,
    fontSize: 12,
    fontWeight: '800',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pendingPill: {
    backgroundColor: '#efe1c3',
  },
  seenPill: {
    backgroundColor: '#dbe7de',
  },
  statusText: {
    color: palette.soil,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
})
