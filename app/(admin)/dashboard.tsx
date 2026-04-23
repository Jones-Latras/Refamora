import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import type {
  AdminListingReportItem,
  AdminListingReportStatus,
  AdminModerationQueueItem,
  AdminReviewQueueStatus,
} from '../../types/app'
import { palette, radii, shadow } from '../../utils/theme'
import {
  getAdminListingReports,
  getAdminModerationQueue,
  updateAdminListingReportStatus,
  updateAdminListingStatus,
  updateAdminModerationQueueStatus,
} from '../../services/adminModerationService'

type AdminTab = 'reports' | 'queue'

const REPORT_REASON_LABELS: Record<string, string> = {
  inaccurate_details: 'Inaccurate details',
  suspicious_listing: 'Suspicious listing',
  wrong_photo: 'Wrong photo',
  spam: 'Spam',
  other: 'Other',
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return 'Unknown time'
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function getReportStatusTone(status: AdminListingReportStatus) {
  switch (status) {
    case 'reviewed':
      return styles.statusPositive
    case 'dismissed':
      return styles.statusMuted
    default:
      return styles.statusWarning
  }
}

function getQueueStatusTone(status: AdminReviewQueueStatus) {
  switch (status) {
    case 'resolved':
      return styles.statusPositive
    case 'dismissed':
      return styles.statusMuted
    default:
      return styles.statusWarning
  }
}

export default function AdminDashboardScreen() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<AdminTab>('reports')
  const [reportFilter, setReportFilter] = useState<AdminListingReportStatus | 'all'>('pending')
  const [queueFilter, setQueueFilter] = useState<AdminReviewQueueStatus | 'all'>('pending')
  const [reports, setReports] = useState<AdminListingReportItem[]>([])
  const [queueItems, setQueueItems] = useState<AdminModerationQueueItem[]>([])
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({})
  const [queueNotes, setQueueNotes] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isActingOnId, setIsActingOnId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadModerationData = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (role !== 'admin') {
      setIsLoading(false)
      return
    }

    if (mode === 'refresh') {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    const [reportsResult, queueResult] = await Promise.all([
      getAdminListingReports(),
      getAdminModerationQueue(),
    ])

    if (reportsResult.error) {
      setErrorMessage(reportsResult.error.message)
    } else if (queueResult.error) {
      setErrorMessage(queueResult.error.message)
    } else {
      setReports(reportsResult.data ?? [])
      setQueueItems(queueResult.data ?? [])
      setErrorMessage(null)
    }

    setIsLoading(false)
    setIsRefreshing(false)
  }

  useEffect(() => {
    void loadModerationData()
  }, [role])

  const visibleReports = useMemo(
    () => reports.filter((item) => reportFilter === 'all' || item.status === reportFilter),
    [reportFilter, reports],
  )
  const visibleQueueItems = useMemo(
    () => queueItems.filter((item) => queueFilter === 'all' || item.queueStatus === queueFilter),
    [queueFilter, queueItems],
  )

  const pendingReportsCount = reports.filter((item) => item.status === 'pending').length
  const pendingQueueCount = queueItems.filter((item) => item.queueStatus === 'pending').length
  const unavailableListingsCount = [...reports, ...queueItems].filter(
    (item) => item.listing?.status === 'unavailable',
  ).length

  const handleReportAction = async (input: {
    item: AdminListingReportItem
    status: AdminListingReportStatus
    suspendListing?: boolean
    restoreListing?: boolean
  }) => {
    if (!user) {
      showToast('Sign in again before continuing admin review.', 'error')
      return
    }

    setIsActingOnId(input.item.id)

    if (input.suspendListing && input.item.listing?.id) {
      const listingResult = await updateAdminListingStatus({
        listingId: input.item.listing.id,
        status: 'unavailable',
      })

      if (listingResult.error) {
        setIsActingOnId(null)
        showToast(listingResult.error.message, 'error')
        return
      }
    }

    if (input.restoreListing && input.item.listing?.id) {
      const listingResult = await updateAdminListingStatus({
        listingId: input.item.listing.id,
        status: 'active',
      })

      if (listingResult.error) {
        setIsActingOnId(null)
        showToast(listingResult.error.message, 'error')
        return
      }
    }

    const reportResult = await updateAdminListingReportStatus({
      reportId: input.item.id,
      status: input.status,
      adminNote: reportNotes[input.item.id] ?? input.item.adminNote,
      reviewerId: user.id,
    })

    setIsActingOnId(null)

    if (reportResult.error) {
      showToast(reportResult.error.message, 'error')
      return
    }

    showToast('Report updated.', 'success')
    void loadModerationData('refresh')
  }

  const handleQueueAction = async (input: {
    item: AdminModerationQueueItem
    status: AdminReviewQueueStatus
    suspendListing?: boolean
    restoreListing?: boolean
  }) => {
    if (!user) {
      showToast('Sign in again before continuing admin review.', 'error')
      return
    }

    setIsActingOnId(input.item.id)

    if (input.suspendListing && input.item.listing?.id) {
      const listingResult = await updateAdminListingStatus({
        listingId: input.item.listing.id,
        status: 'unavailable',
      })

      if (listingResult.error) {
        setIsActingOnId(null)
        showToast(listingResult.error.message, 'error')
        return
      }
    }

    if (input.restoreListing && input.item.listing?.id) {
      const listingResult = await updateAdminListingStatus({
        listingId: input.item.listing.id,
        status: 'active',
      })

      if (listingResult.error) {
        setIsActingOnId(null)
        showToast(listingResult.error.message, 'error')
        return
      }
    }

    const queueResult = await updateAdminModerationQueueStatus({
      queueId: input.item.id,
      status: input.status,
      adminNote: queueNotes[input.item.id] ?? input.item.adminNote,
      reviewerId: user.id,
    })

    setIsActingOnId(null)

    if (queueResult.error) {
      showToast(queueResult.error.message, 'error')
      return
    }

    showToast('Queue item updated.', 'success')
    void loadModerationData('refresh')
  }

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateWrap}>
          <EmptyState
            title="Admin access required"
            description="This moderation dashboard is only available to accounts with the admin role."
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
            title="Moderation dashboard unavailable"
            description={errorMessage}
            onAction={() => {
              void loadModerationData()
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
              void loadModerationData('refresh')
            }}
          />
        }
      >
        <View style={styles.hero}>
          <Text style={styles.title}>Moderation operations</Text>
          <Text style={styles.subtitle}>
            Review user-submitted reports and AI-flagged listings without leaving the app.
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{pendingReportsCount}</Text>
            <Text style={styles.metricLabel}>Pending reports</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{pendingQueueCount}</Text>
            <Text style={styles.metricLabel}>Pending AI reviews</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{unavailableListingsCount}</Text>
            <Text style={styles.metricLabel}>Unavailable listings</Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/(admin)/verifications')}
          style={styles.verificationNavCard}
        >
          <Text style={styles.verificationNavTitle}>Seller verification reviews</Text>
          <Text style={styles.verificationNavText}>
            Open the verification queue to approve or reject seller document submissions.
          </Text>
        </Pressable>

        <View style={styles.segmentRow}>
          <Pressable
            onPress={() => setActiveTab('reports')}
            style={[styles.segmentButton, activeTab === 'reports' ? styles.segmentActive : null]}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === 'reports' ? styles.segmentTextActive : null,
              ]}
            >
              User reports
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('queue')}
            style={[styles.segmentButton, activeTab === 'queue' ? styles.segmentActive : null]}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === 'queue' ? styles.segmentTextActive : null,
              ]}
            >
              AI review queue
            </Text>
          </Pressable>
        </View>

        {activeTab === 'reports' ? (
          <>
            <View style={styles.filterRow}>
              {(['pending', 'reviewed', 'dismissed', 'all'] as const).map((filterValue) => (
                <Pressable
                  key={filterValue}
                  onPress={() => setReportFilter(filterValue)}
                  style={[
                    styles.filterChip,
                    reportFilter === filterValue ? styles.filterChipActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      reportFilter === filterValue ? styles.filterChipTextActive : null,
                    ]}
                  >
                    {filterValue === 'all'
                      ? 'All'
                      : filterValue.charAt(0).toUpperCase() + filterValue.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {isLoading ? (
              <View style={styles.card}>
                <Text style={styles.loadingText}>Loading reports...</Text>
              </View>
            ) : visibleReports.length === 0 ? (
              <EmptyState
                title="No matching reports"
                description="There are no report items in this filter right now."
              />
            ) : (
              visibleReports.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>
                      {item.listing?.title ?? 'Reported listing'}
                    </Text>
                    <View style={[styles.statusBadge, getReportStatusTone(item.status)]}>
                      <Text style={styles.statusBadgeText}>{item.status}</Text>
                    </View>
                  </View>

                  <Text style={styles.metaText}>
                    Reason: {REPORT_REASON_LABELS[item.reason] ?? item.reason}
                  </Text>
                  <Text style={styles.metaText}>
                    Seller: {item.seller?.fullName ?? 'Unknown seller'}
                    {item.seller?.city ? ` | ${item.seller.city}` : ''}
                  </Text>
                  <Text style={styles.metaText}>
                    Reporter: {item.reporter?.fullName ?? 'Unknown user'}
                  </Text>
                  <Text style={styles.metaText}>
                    Submitted: {formatTimestamp(item.createdAt)}
                  </Text>
                  <Text style={styles.metaText}>
                    Listing status: {item.listing?.status ?? 'unknown'}
                  </Text>

                  {item.details ? <Text style={styles.detailText}>{item.details}</Text> : null}

                  <TextInput
                    value={reportNotes[item.id] ?? item.adminNote ?? ''}
                    onChangeText={(value) =>
                      setReportNotes((current) => ({ ...current, [item.id]: value }))
                    }
                    placeholder="Admin note"
                    placeholderTextColor="#9e9183"
                    multiline
                    style={styles.noteInput}
                  />

                  <View style={styles.actionRow}>
                    <Pressable
                      disabled={isActingOnId === item.id}
                      onPress={() => void handleReportAction({ item, status: 'reviewed' })}
                      style={[styles.actionButton, styles.primaryAction]}
                    >
                      <Text style={styles.primaryActionText}>Mark reviewed</Text>
                    </Pressable>
                    <Pressable
                      disabled={isActingOnId === item.id}
                      onPress={() => void handleReportAction({ item, status: 'dismissed' })}
                      style={[styles.actionButton, styles.secondaryAction]}
                    >
                      <Text style={styles.secondaryActionText}>Dismiss</Text>
                    </Pressable>
                  </View>

                  <View style={styles.actionRow}>
                    <Pressable
                      disabled={isActingOnId === item.id || !item.listing?.id}
                      onPress={() =>
                        void handleReportAction({
                          item,
                          status: 'reviewed',
                          suspendListing: true,
                        })
                      }
                      style={[styles.actionButton, styles.warningAction]}
                    >
                      <Text style={styles.warningActionText}>Suspend listing</Text>
                    </Pressable>
                    <Pressable
                      disabled={isActingOnId === item.id || !item.listing?.id}
                      onPress={() =>
                        void handleReportAction({
                          item,
                          status: 'reviewed',
                          restoreListing: true,
                        })
                      }
                      style={[styles.actionButton, styles.secondaryAction]}
                    >
                      <Text style={styles.secondaryActionText}>Restore listing</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <View style={styles.filterRow}>
              {(['pending', 'resolved', 'dismissed', 'all'] as const).map((filterValue) => (
                <Pressable
                  key={filterValue}
                  onPress={() => setQueueFilter(filterValue)}
                  style={[
                    styles.filterChip,
                    queueFilter === filterValue ? styles.filterChipActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      queueFilter === filterValue ? styles.filterChipTextActive : null,
                    ]}
                  >
                    {filterValue === 'all'
                      ? 'All'
                      : filterValue.charAt(0).toUpperCase() + filterValue.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {isLoading ? (
              <View style={styles.card}>
                <Text style={styles.loadingText}>Loading AI review queue...</Text>
              </View>
            ) : visibleQueueItems.length === 0 ? (
              <EmptyState
                title="No matching review items"
                description="There are no AI moderation items in this filter right now."
              />
            ) : (
              visibleQueueItems.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <View style={[styles.statusBadge, getQueueStatusTone(item.queueStatus)]}>
                      <Text style={styles.statusBadgeText}>{item.queueStatus}</Text>
                    </View>
                  </View>

                  <Text style={styles.metaText}>
                    Decision: {item.decision === 'block' ? 'Block' : 'Needs review'}
                  </Text>
                  <Text style={styles.metaText}>
                    Seller: {item.seller?.fullName ?? 'Unknown seller'}
                    {item.seller?.city ? ` | ${item.seller.city}` : ''}
                  </Text>
                  <Text style={styles.metaText}>
                    Submitted: {formatTimestamp(item.createdAt)}
                  </Text>
                  <Text style={styles.metaText}>
                    Listing status: {item.listing?.status ?? 'unknown'}
                  </Text>

                  {item.reasons.length > 0 ? (
                    <Text style={styles.detailText}>Reasons: {item.reasons.join(' | ')}</Text>
                  ) : null}
                  {item.fieldWarnings.length > 0 ? (
                    <Text style={styles.detailText}>
                      Field warnings: {item.fieldWarnings.join(' | ')}
                    </Text>
                  ) : null}
                  {item.imageWarnings.length > 0 ? (
                    <Text style={styles.detailText}>
                      Image warnings: {item.imageWarnings.join(' | ')}
                    </Text>
                  ) : null}

                  <TextInput
                    value={queueNotes[item.id] ?? item.adminNote ?? ''}
                    onChangeText={(value) =>
                      setQueueNotes((current) => ({ ...current, [item.id]: value }))
                    }
                    placeholder="Admin note"
                    placeholderTextColor="#9e9183"
                    multiline
                    style={styles.noteInput}
                  />

                  <View style={styles.actionRow}>
                    <Pressable
                      disabled={isActingOnId === item.id}
                      onPress={() => void handleQueueAction({ item, status: 'resolved' })}
                      style={[styles.actionButton, styles.primaryAction]}
                    >
                      <Text style={styles.primaryActionText}>Resolve</Text>
                    </Pressable>
                    <Pressable
                      disabled={isActingOnId === item.id}
                      onPress={() => void handleQueueAction({ item, status: 'dismissed' })}
                      style={[styles.actionButton, styles.secondaryAction]}
                    >
                      <Text style={styles.secondaryActionText}>Dismiss</Text>
                    </Pressable>
                  </View>

                  <View style={styles.actionRow}>
                    <Pressable
                      disabled={isActingOnId === item.id || !item.listing?.id}
                      onPress={() =>
                        void handleQueueAction({
                          item,
                          status: 'resolved',
                          suspendListing: true,
                        })
                      }
                      style={[styles.actionButton, styles.warningAction]}
                    >
                      <Text style={styles.warningActionText}>Suspend listing</Text>
                    </Pressable>
                    <Pressable
                      disabled={isActingOnId === item.id || !item.listing?.id}
                      onPress={() =>
                        void handleQueueAction({
                          item,
                          status: 'resolved',
                          restoreListing: true,
                        })
                      }
                      style={[styles.actionButton, styles.secondaryAction]}
                    >
                      <Text style={styles.secondaryActionText}>Restore listing</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </>
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
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 4,
    ...shadow,
  },
  metricValue: {
    color: palette.soil,
    fontSize: 24,
    fontWeight: '800',
  },
  metricLabel: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  verificationNavCard: {
    backgroundColor: '#eef5ef',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
    padding: 16,
    gap: 4,
  },
  verificationNavTitle: {
    color: palette.soil,
    fontSize: 16,
    fontWeight: '800',
  },
  verificationNavText: {
    color: palette.sageDark,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingVertical: 12,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: palette.sage,
    borderColor: palette.sage,
  },
  segmentText: {
    color: palette.soil,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: palette.cream,
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
    gap: 10,
    ...shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    color: palette.soil,
    fontSize: 17,
    fontWeight: '800',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusWarning: {
    backgroundColor: '#f5ecd6',
  },
  statusPositive: {
    backgroundColor: '#e8f2ea',
  },
  statusMuted: {
    backgroundColor: '#efefef',
  },
  statusBadgeText: {
    color: palette.soil,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  metaText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  detailText: {
    color: palette.soil,
    fontSize: 13,
    lineHeight: 20,
  },
  noteInput: {
    minHeight: 72,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.parchment,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: palette.ink,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 12,
  },
  primaryAction: {
    backgroundColor: palette.sage,
  },
  primaryActionText: {
    color: palette.cream,
    fontWeight: '800',
    fontSize: 12,
  },
  secondaryAction: {
    backgroundColor: palette.parchment,
  },
  secondaryActionText: {
    color: palette.clay,
    fontWeight: '800',
    fontSize: 12,
  },
  warningAction: {
    backgroundColor: '#f9e4df',
  },
  warningActionText: {
    color: palette.error,
    fontWeight: '800',
    fontSize: 12,
  },
  loadingText: {
    color: palette.muted,
    fontSize: 14,
    textAlign: 'center',
  },
})
