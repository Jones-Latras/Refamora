import { useEffect, useMemo, useState } from 'react'
import {
  Pressable,
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
import { getAdminCrashReports } from '../../services/adminCrashReportsService'
import type { AdminCrashReportItem, CrashReportSeverity } from '../../types/app'
import { palette, radii, shadow } from '../../utils/theme'

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function truncateValue(value: string | null, maxLength = 220) {
  if (!value) {
    return null
  }

  const trimmed = value.trim()

  if (trimmed.length <= maxLength) {
    return trimmed
  }

  return `${trimmed.slice(0, maxLength)}...`
}

export default function AdminCrashReportsScreen() {
  const { role } = useAuth()
  const [items, setItems] = useState<AdminCrashReportItem[]>([])
  const [filter, setFilter] = useState<CrashReportSeverity | 'all'>('all')
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

    const result = await getAdminCrashReports()

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

  const visibleItems = useMemo(
    () => items.filter((item) => filter === 'all' || item.severity === filter),
    [filter, items],
  )

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateWrap}>
          <EmptyState
            title="Admin access required"
            description="Only admin accounts can review app crash reports."
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
            title="Crash reports unavailable"
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
          <Text style={styles.title}>App crash reports</Text>
          <Text style={styles.subtitle}>
            Review client-side render and JavaScript failures captured from the live app.
          </Text>
        </View>

        <View style={styles.filterRow}>
          {(['all', 'fatal', 'error'] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setFilter(value)}
              style={[styles.filterChip, filter === value ? styles.filterChipActive : null]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === value ? styles.filterChipTextActive : null,
                ]}
              >
                {value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.card}>
            <Text style={styles.loadingText}>Loading crash reports...</Text>
          </View>
        ) : visibleItems.length === 0 ? (
          <EmptyState
            title="No matching crash reports"
            description="Crash entries will appear here after the app reports a captured failure."
          />
        ) : (
          visibleItems.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.headerRow}>
                <View style={styles.headerTextBlock}>
                  <Text style={styles.cardTitle}>{item.message}</Text>
                  <Text style={styles.metaText}>
                    {item.route ?? 'Unknown route'} | {item.platform} | {item.appEnv}
                    {item.appVersion ? ` | v${item.appVersion}` : ''}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    item.severity === 'fatal' ? styles.statusNegative : styles.statusWarning,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>{item.severity}</Text>
                </View>
              </View>

              <Text style={styles.metaText}>
                Source: {item.source === 'react_error_boundary' ? 'React error boundary' : 'Global JS handler'}
              </Text>
              <Text style={styles.metaText}>
                User: {item.user?.fullName ?? 'Anonymous or unavailable'}
                {item.user?.email ? ` | ${item.user.email}` : ''}
              </Text>
              <Text style={styles.metaText}>Captured: {formatTimestamp(item.createdAt)}</Text>

              {truncateValue(item.stack) ? (
                <Text style={styles.detailText}>Stack: {truncateValue(item.stack)}</Text>
              ) : null}
              {truncateValue(item.componentStack) ? (
                <Text style={styles.detailText}>
                  Component stack: {truncateValue(item.componentStack)}
                </Text>
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: '#eef5ef',
    borderColor: 'rgba(58, 102, 72, 0.18)',
  },
  filterChipText: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: palette.sageDark,
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
  headerTextBlock: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: palette.soil,
    fontSize: 16,
    fontWeight: '800',
  },
  metaText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  detailText: {
    color: palette.soil,
    fontSize: 13,
    lineHeight: 19,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusWarning: {
    backgroundColor: '#f5ecd6',
  },
  statusNegative: {
    backgroundColor: '#f9e4df',
  },
  statusBadgeText: {
    color: palette.soil,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  loadingText: {
    color: palette.muted,
    fontSize: 14,
    textAlign: 'center',
  },
})
