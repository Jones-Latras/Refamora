import { useEffect, useState } from 'react'
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { useAuth } from '../../hooks/useAuth'
import { getAdminAuditLogs } from '../../services/adminAuditService'
import type { AdminAuditLogItem } from '../../types/app'
import { palette, radii, shadow } from '../../utils/theme'

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function toReadableLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function buildAuditSummary(item: AdminAuditLogItem) {
  const previousStatus =
    typeof item.metadata.previous_status === 'string' ? item.metadata.previous_status : null
  const nextStatus =
    typeof item.metadata.next_status === 'string' ? item.metadata.next_status : null

  if (previousStatus || nextStatus) {
    return `${toReadableLabel(item.actionType)}: ${previousStatus ?? 'unknown'} -> ${nextStatus ?? 'unknown'}`
  }

  return toReadableLabel(item.actionType)
}

export default function AdminAuditLogScreen() {
  const { role } = useAuth()
  const [items, setItems] = useState<AdminAuditLogItem[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadItems = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (role !== 'admin') {
      setIsLoading(false)
      return
    }

    if (mode === 'refresh') {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    const result = await getAdminAuditLogs()

    if (result.error) {
      setErrorMessage(result.error.message)
    } else {
      setItems(result.data ?? [])
      setErrorMessage(null)
    }

    setIsLoading(false)
    setIsRefreshing(false)
  }

  useEffect(() => {
    void loadItems()
  }, [role])

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateWrap}>
          <EmptyState
            title="Admin access required"
            description="Only admin accounts can review the audit log."
          />
        </View>
      </SafeAreaView>
    )
  }

  if (errorMessage && !isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateWrap}>
          <ErrorState
            title="Audit log unavailable"
            description={errorMessage}
            onAction={() => {
              void loadItems()
            }}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor={palette.sageDark}
            onRefresh={() => {
              void loadItems('refresh')
            }}
          />
        }
      >
        <View style={styles.hero}>
          <Text style={styles.title}>Admin audit log</Text>
          <Text style={styles.subtitle}>
            Review sensitive moderation, listing, and verification actions recorded by admin accounts.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.card}>
            <Text style={styles.loadingText}>Loading audit entries...</Text>
          </View>
        ) : items.length === 0 ? (
          <EmptyState
            title="No admin actions recorded yet"
            description="Audit entries will appear here after moderation, listing status, or verification actions are performed."
          />
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.cardTitle}>{buildAuditSummary(item)}</Text>
                <Text style={styles.timestamp}>{formatTimestamp(item.createdAt)}</Text>
              </View>

              <Text style={styles.metaText}>
                Admin: {item.admin?.fullName ?? 'Unknown admin'}
                {item.admin?.email ? ` | ${item.admin.email}` : ''}
              </Text>
              <Text style={styles.metaText}>
                Entity: {toReadableLabel(item.entityType)} | ID: {item.entityId}
              </Text>

              {typeof item.metadata.listing_id === 'string' ? (
                <Text style={styles.metaText}>Listing: {item.metadata.listing_id}</Text>
              ) : null}
              {typeof item.metadata.seller_id === 'string' ? (
                <Text style={styles.metaText}>Seller: {item.metadata.seller_id}</Text>
              ) : null}
              {typeof item.metadata.decision === 'string' ? (
                <Text style={styles.metaText}>Decision: {item.metadata.decision}</Text>
              ) : null}
            </View>
          ))
        )}
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
    padding: 20,
    gap: 16,
  },
  stateWrap: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  hero: {
    gap: 6,
  },
  title: {
    color: palette.soil,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 8,
    ...shadow,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  cardTitle: {
    flex: 1,
    color: palette.soil,
    fontSize: 16,
    fontWeight: '800',
  },
  timestamp: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  metaText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  loadingText: {
    color: palette.muted,
    fontSize: 14,
    textAlign: 'center',
  },
})
