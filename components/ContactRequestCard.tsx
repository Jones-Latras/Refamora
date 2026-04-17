import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { ContactRequestSummary } from '../types/app'

import { formatDate } from '../utils/formatters'
import { palette, radii } from '../utils/theme'

type ContactRequestCardProps = {
  request: ContactRequestSummary
  role: 'buyer' | 'seller'
  actionLabel?: string
  onActionPress?: () => void
  secondaryActionLabel?: string
  onSecondaryActionPress?: () => void
}

function getStatusLabel(
  status: ContactRequestSummary['status'],
  role: 'buyer' | 'seller',
) {
  if (role === 'buyer') {
    if (status === 'pending') {
      return 'sent'
    }

    return status
  }

  if (status === 'pending') {
    return 'new'
  }

  return status
}

export function ContactRequestCard({
  request,
  role,
  actionLabel,
  onActionPress,
  secondaryActionLabel,
  onSecondaryActionPress,
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
            request.status === 'pending'
              ? styles.pendingPill
              : request.status === 'responded'
                ? styles.respondedPill
                : styles.seenPill,
          ]}
        >
          <Text style={styles.statusText}>{getStatusLabel(request.status, role)}</Text>
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
        <View style={styles.actionRow}>
          <Pressable onPress={onActionPress} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>{actionLabel}</Text>
          </Pressable>
          {secondaryActionLabel && onSecondaryActionPress ? (
            <Pressable
              onPress={onSecondaryActionPress}
              style={styles.secondaryActionButton}
            >
              <Text style={styles.secondaryActionButtonText}>
                {secondaryActionLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
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
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryActionButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: palette.surface,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: palette.border,
  },
  secondaryActionButtonText: {
    color: palette.clay,
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
  respondedPill: {
    backgroundColor: '#d8ecf4',
  },
  statusText: {
    color: palette.soil,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
})
