import * as Linking from 'expo-linking'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AppImage } from '../../components/AppImage'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { VerifiedBadge } from '../../components/VerifiedBadge'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { signOut } from '../../services/authService'
import { getAdminCrashReports } from '../../services/adminCrashReportsService'
import {
  getAdminListingReports,
  getAdminModerationQueue,
  updateAdminListingReportStatus,
  updateAdminListingStatus,
  updateAdminModerationQueueStatus,
} from '../../services/adminModerationService'
import {
  getAdminSellerVerificationRequests,
  updateAdminSellerVerificationStatus,
} from '../../services/sellerVerificationService'
import { getVerificationDocumentSignedUrl } from '../../services/storageService'
import type {
  AdminCrashReportItem,
  AdminListingReportItem,
  AdminListingReportStatus,
  AdminModerationQueueItem,
  AdminReviewQueueStatus,
  AdminSellerVerificationItem,
  SellerVerificationDocumentType,
  SellerVerificationRequestStatus,
} from '../../types/app'
import { palette, radii, shadow } from '../../utils/theme'

type AdminTab = 'reports' | 'queue' | 'verifications'

const REPORT_REASON_LABELS: Record<string, string> = {
  inaccurate_details: 'Inaccurate details',
  suspicious_listing: 'Suspicious listing',
  wrong_photo: 'Wrong photo',
  spam: 'Spam',
  other: 'Other',
}

const DOCUMENT_LABELS: Record<SellerVerificationDocumentType, string> = {
  government_id: 'Government ID',
  farm_id: 'Farm ID',
  business_permit: 'Business permit',
  cooperative_certificate: 'Cooperative certificate',
  other: 'Other proof',
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

function getVerificationStatusTone(status: SellerVerificationRequestStatus) {
  switch (status) {
    case 'approved':
      return styles.statusPositive
    case 'rejected':
      return styles.statusNegative
    default:
      return styles.statusWarning
  }
}

function truncateValue(value: string, maxLength = 140) {
  const trimmed = value.trim()

  if (trimmed.length <= maxLength) {
    return trimmed
  }

  return `${trimmed.slice(0, maxLength)}...`
}

type MetricCardProps = {
  value: string
  label: string
  hint?: string
  icon: keyof typeof Feather.glyphMap
  tone?: 'default' | 'warning' | 'danger' | 'success'
}

function MetricCard({ value, label, hint, icon, tone = 'default' }: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricTopRow}>
        <View
          style={[
            styles.metricIcon,
            tone === 'warning'
              ? styles.metricIconWarning
              : tone === 'danger'
                ? styles.metricIconDanger
                : tone === 'success'
                  ? styles.metricIconSuccess
                  : null,
          ]}
        >
          <Feather
            name={icon}
            size={15}
            color={
              tone === 'danger'
                ? palette.error
                : tone === 'warning'
                  ? palette.harvest
                  : palette.sageDark
            }
          />
        </View>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      {hint ? <Text style={styles.metricHint}>{hint}</Text> : null}
    </View>
  )
}

type QuickToolCardProps = {
  title: string
  description: string
  icon: keyof typeof Feather.glyphMap
  onPress: () => void
}

function QuickToolCard({ title, description, icon, onPress }: QuickToolCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.quickCard}>
      <View style={styles.quickCardHeader}>
        <View style={styles.quickIcon}>
          <Feather name={icon} size={15} color={palette.sageDark} />
        </View>
        <Feather name="chevron-right" size={16} color={palette.sageDark} />
      </View>
      <Text style={styles.quickCardTitle}>{title}</Text>
      <Text style={styles.quickCardText}>{description}</Text>
    </Pressable>
  )
}

export default function AdminDashboardScreen() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<AdminTab>('reports')
  const [reportFilter, setReportFilter] = useState<AdminListingReportStatus | 'all'>('pending')
  const [queueFilter, setQueueFilter] = useState<AdminReviewQueueStatus | 'all'>('pending')
  const [verificationFilter, setVerificationFilter] = useState<
    SellerVerificationRequestStatus | 'all'
  >('pending')
  const [reports, setReports] = useState<AdminListingReportItem[]>([])
  const [queueItems, setQueueItems] = useState<AdminModerationQueueItem[]>([])
  const [verificationItems, setVerificationItems] = useState<AdminSellerVerificationItem[]>([])
  const [crashReports, setCrashReports] = useState<AdminCrashReportItem[]>([])
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({})
  const [queueNotes, setQueueNotes] = useState<Record<string, string>>({})
  const [verificationNotes, setVerificationNotes] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isActingOnId, setIsActingOnId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadAdminData = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (role !== 'admin') {
      setIsLoading(false)
      return
    }

    if (mode === 'refresh') {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    const [reportsResult, queueResult, verificationResult, crashResult] = await Promise.all([
      getAdminListingReports(),
      getAdminModerationQueue(),
      getAdminSellerVerificationRequests(),
      getAdminCrashReports(12),
    ])

    if (reportsResult.error) {
      setErrorMessage(reportsResult.error.message)
    } else if (queueResult.error) {
      setErrorMessage(queueResult.error.message)
    } else if (verificationResult.error) {
      setErrorMessage(verificationResult.error.message)
    } else if (crashResult.error) {
      setErrorMessage(crashResult.error.message)
    } else {
      setReports(reportsResult.data ?? [])
      setQueueItems(queueResult.data ?? [])
      setVerificationItems(verificationResult.data ?? [])
      setCrashReports(crashResult.data ?? [])
      setErrorMessage(null)
    }

    setIsLoading(false)
    setIsRefreshing(false)
  }

  useEffect(() => {
    void loadAdminData()
  }, [role])

  const visibleReports = useMemo(
    () => reports.filter((item) => reportFilter === 'all' || item.status === reportFilter),
    [reportFilter, reports],
  )
  const visibleQueueItems = useMemo(
    () => queueItems.filter((item) => queueFilter === 'all' || item.queueStatus === queueFilter),
    [queueFilter, queueItems],
  )
  const visibleVerificationItems = useMemo(
    () =>
      verificationItems.filter(
        (item) => verificationFilter === 'all' || item.status === verificationFilter,
      ),
    [verificationFilter, verificationItems],
  )

  const pendingReportsCount = reports.filter((item) => item.status === 'pending').length
  const pendingQueueCount = queueItems.filter((item) => item.queueStatus === 'pending').length
  const pendingVerificationCount = verificationItems.filter(
    (item) => item.status === 'pending',
  ).length
  const unavailableListingsCount = [...reports, ...queueItems].filter(
    (item) => item.listing?.status === 'unavailable',
  ).length
  const fatalCrashCount = crashReports.filter((item) => item.severity === 'fatal').length
  const recentCrashHint = crashReports[0]
    ? `Last crash ${formatTimestamp(crashReports[0].createdAt)}`
    : 'No crash reports yet'

  const handleOpenDocument = async (documentPath: string) => {
    const result = await getVerificationDocumentSignedUrl(documentPath)

    if (result.error || !result.data) {
      showToast(result.error?.message ?? 'Unable to open the uploaded document.', 'error')
      return
    }

    await Linking.openURL(result.data)
  }

  const handleLogout = async () => {
    await signOut()
    router.replace('/(auth)/login')
  }

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
    void loadAdminData('refresh')
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
    void loadAdminData('refresh')
  }

  const handleVerificationAction = async (
    item: AdminSellerVerificationItem,
    status: SellerVerificationRequestStatus,
  ) => {
    if (!user) {
      showToast('Sign in again before continuing admin review.', 'error')
      return
    }

    const adminNote = (verificationNotes[item.id] ?? item.adminNote ?? '').trim()

    if (status === 'rejected' && !adminNote) {
      showToast('Add an admin note before rejecting this verification request.', 'error')
      return
    }

    setIsActingOnId(item.id)
    const result = await updateAdminSellerVerificationStatus({
      requestId: item.id,
      sellerId: item.sellerId,
      status,
      adminNote,
      reviewerId: user.id,
    })
    setIsActingOnId(null)

    if (result.error) {
      showToast(result.error.message, 'error')
      return
    }

    showToast('Verification request updated.', 'success')
    void loadAdminData('refresh')
  }

  const confirmVerificationAction = (
    item: AdminSellerVerificationItem,
    status: SellerVerificationRequestStatus,
  ) => {
    if (status === 'rejected') {
      void handleVerificationAction(item, status)
      return
    }

    Alert.alert(
      'Approve seller verification?',
      `${item.seller?.fullName ?? 'This seller'} will receive a verified seller badge and can publish listings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => void handleVerificationAction(item, status),
        },
      ],
    )
  }

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateWrap}>
          <EmptyState
            title="Admin access required"
            description="This dashboard is only available to accounts with the admin role."
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
            title="Admin dashboard unavailable"
            description={errorMessage}
            onAction={() => {
              void loadAdminData()
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
              void loadAdminData('refresh')
            }}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <View style={styles.heroTextBlock}>
              <View style={styles.adminBadge}>
                <Feather name="shield" size={12} color={palette.sageDark} />
                <Text style={styles.adminBadgeText}>Admin Panel</Text>
              </View>
              <Text style={styles.title}>Admin operations hub</Text>
              <Text style={styles.subtitle}>
                Monitor seller verification, user reports, AI reviews, and system health from one focused workspace.
              </Text>
            </View>
            <Pressable onPress={handleLogout} style={styles.logoutButton}>
              <Feather name="log-out" size={13} color={palette.error} />
              <Text style={styles.logoutButtonText}>Log out</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            value={pendingReportsCount.toString()}
            label="Pending reports"
            hint="Needs action"
            icon="flag"
            tone="warning"
          />
          <MetricCard
            value={pendingQueueCount.toString()}
            label="Pending AI reviews"
            hint="Review queue"
            icon="zap"
            tone="warning"
          />
          <MetricCard
            value={pendingVerificationCount.toString()}
            label="Pending verifications"
            hint="Seller checks"
            icon="credit-card"
          />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            value={unavailableListingsCount.toString()}
            label="Unavailable listings"
            hint="Paused or held"
            icon="pause-circle"
          />
          <MetricCard
            value={fatalCrashCount.toString()}
            label="Fatal crashes"
            hint="High priority"
            icon="alert-triangle"
            tone="danger"
          />
          <MetricCard
            value={crashReports.length.toString()}
            label="Crash reports"
            hint={recentCrashHint}
            icon="activity"
            tone={crashReports.length > 0 ? 'warning' : 'success'}
          />
        </View>

        <View style={styles.sectionIntro}>
          <Text style={styles.sectionTitle}>Admin tools</Text>
          <Text style={styles.sectionSubtitle}>Jump into focused review and reporting workflows.</Text>
        </View>
        <View style={styles.quickGrid}>
          <QuickToolCard
            title="Verifications"
            description="Review seller documents and approval queue."
            icon="shield"
            onPress={() => router.push('/(admin)/verifications')}
          />
          <QuickToolCard
            title="Audit log"
            description="Track sensitive admin decisions."
            icon="clipboard"
            onPress={() => router.push('/(admin)/audit-log')}
          />
          <QuickToolCard
            title="Analytics"
            description="Inspect marketplace growth and activity."
            icon="bar-chart-2"
            onPress={() => router.push('/(admin)/analytics' as never)}
          />
          <QuickToolCard
            title="Crash reports"
            description="Investigate app failures and routes."
            icon="alert-octagon"
            onPress={() => router.push('/(admin)/crashes')}
          />
        </View>

        {crashReports.length > 0 ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Recent app crashes</Text>
                <Text style={styles.sectionSubtitle}>
                  Latest client failures visible from the admin hub.
                </Text>
              </View>
              <Pressable onPress={() => router.push('/(admin)/crashes')} style={styles.inlineLink}>
                <Text style={styles.inlineLinkText}>Open full crash log</Text>
              </Pressable>
            </View>

            <View style={styles.stack}>
              {crashReports.slice(0, 3).map((item) => (
                <View key={item.id} style={styles.inlineCard}>
                  <View style={styles.inlineCardHeader}>
                    <Text style={styles.inlineCardTitle}>{truncateValue(item.message, 80)}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        item.severity === 'fatal'
                          ? styles.statusFatal
                          : styles.statusWarningStrong,
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>{item.severity}</Text>
                    </View>
                  </View>
                  <View style={styles.metadataRow}>
                    <Text style={styles.codeMeta} numberOfLines={1}>
                      {item.route ?? 'Unknown route'}
                    </Text>
                    <Text style={styles.metaText}>{item.platform}</Text>
                    <Text style={styles.metaText}>{formatTimestamp(item.createdAt)}</Text>
                  </View>
                  <Pressable
                    onPress={() => router.push('/(admin)/crashes')}
                    style={styles.smallInlineLink}
                  >
                    <Text style={styles.smallInlineLinkText}>View details</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.reviewSectionHeader}>
          <Text style={styles.sectionTitle}>Review queues</Text>
          <Text style={styles.sectionSubtitle}>Triage reports, AI moderation, and seller approvals.</Text>
          <View style={styles.segmentRow}>
            {([
              ['reports', 'User reports'],
              ['queue', 'AI review queue'],
              ['verifications', 'Verifications'],
            ] as const).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setActiveTab(value)}
                style={[styles.segmentButton, activeTab === value ? styles.segmentActive : null]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    activeTab === value ? styles.segmentTextActive : null,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
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
                    placeholder="Add reason or internal note before resolving this report"
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
        ) : activeTab === 'queue' ? (
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

                  <View style={styles.reviewImageFrame}>
                    {item.listing?.imageUrl ? (
                      <AppImage
                        uri={item.listing.imageUrl}
                        style={styles.reviewImage}
                      />
                    ) : (
                      <View style={styles.reviewImageFallback}>
                        <Feather name="image" size={22} color={palette.muted} />
                        <Text style={styles.reviewImageFallbackText}>
                          No listing photo attached
                        </Text>
                      </View>
                    )}
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
                    placeholder="Add reason or internal note before resolving this review"
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
        ) : (
          <>
            <View style={styles.filterRow}>
              {(['pending', 'approved', 'rejected', 'all'] as const).map((filterValue) => (
                <Pressable
                  key={filterValue}
                  onPress={() => setVerificationFilter(filterValue)}
                  style={[
                    styles.filterChip,
                    verificationFilter === filterValue ? styles.filterChipActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      verificationFilter === filterValue ? styles.filterChipTextActive : null,
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
                <Text style={styles.loadingText}>Loading verification requests...</Text>
              </View>
            ) : visibleVerificationItems.length === 0 ? (
              <EmptyState
                title="No matching verification requests"
                description="There are no seller verification requests in this filter right now."
              />
            ) : (
              visibleVerificationItems.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerTextBlock}>
                      <Text style={styles.cardTitle}>{item.seller?.fullName ?? 'Unknown seller'}</Text>
                      <Text style={styles.metaText}>Seller</Text>
                      <Text style={styles.sellerMetaText}>
                        {item.seller?.city ?? 'Location not provided'}
                        {item.seller?.email ? ` · ${item.seller.email}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, getVerificationStatusTone(item.status)]}>
                      <Text style={styles.statusBadgeText}>{item.status}</Text>
                    </View>
                  </View>

                  {item.status === 'approved' ? <VerifiedBadge /> : null}

                  <View style={styles.metadataGrid}>
                    <View style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Document</Text>
                      <Text style={styles.metadataValue}>
                        {DOCUMENT_LABELS[item.documentType] ?? 'Verification proof'}
                      </Text>
                    </View>
                    <View style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Reference</Text>
                      <Text style={styles.metadataValue}>{item.documentNumber}</Text>
                    </View>
                    <View style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Submitted</Text>
                      <Text style={styles.metadataValue}>{formatTimestamp(item.createdAt)}</Text>
                    </View>
                  </View>
                  {item.notes ? (
                    <View style={styles.codeBox}>
                      <Text style={styles.codeBoxText}>{item.notes}</Text>
                    </View>
                  ) : null}
                  {item.adminNote ? (
                    <Text style={styles.metaText}>Admin note: {item.adminNote}</Text>
                  ) : null}

                  <Pressable
                    onPress={() => void handleOpenDocument(item.documentPath)}
                    style={styles.inlineAction}
                  >
                    <Text style={styles.inlineActionText}>Open document</Text>
                  </Pressable>

                  <TextInput
                    value={verificationNotes[item.id] ?? item.adminNote ?? ''}
                    onChangeText={(value) =>
                      setVerificationNotes((current) => ({ ...current, [item.id]: value }))
                    }
                    placeholder="Add reason or internal note before approving/rejecting"
                    placeholderTextColor="#9e9183"
                    multiline
                    style={styles.noteInput}
                  />
                  <Text style={styles.noteHelper}>Admin note required when rejecting.</Text>

                  <View style={styles.actionRow}>
                    <Pressable
                      disabled={isActingOnId === item.id}
                      onPress={() => confirmVerificationAction(item, 'approved')}
                      style={[styles.actionButton, styles.primaryAction]}
                    >
                      <Text style={styles.primaryActionText}>
                        {isActingOnId === item.id ? 'Working...' : 'Approve'}
                      </Text>
                    </Pressable>
                    <Pressable
                      disabled={isActingOnId === item.id || !(verificationNotes[item.id] ?? item.adminNote ?? '').trim()}
                      onPress={() => confirmVerificationAction(item, 'rejected')}
                      style={[styles.actionButton, styles.warningAction]}
                    >
                      <Text style={styles.warningActionText}>
                        {isActingOnId === item.id ? 'Working...' : 'Reject'}
                      </Text>
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
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroTextBlock: {
    flex: 1,
    gap: 6,
  },
  adminBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#eef5ef',
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  adminBadgeText: {
    color: palette.sageDark,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#f9e4df',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logoutButtonText: {
    color: palette.error,
    fontSize: 12,
    fontWeight: '800',
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
  metricTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#eef5ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconWarning: {
    backgroundColor: '#f5ecd6',
  },
  metricIconDanger: {
    backgroundColor: '#f9e4df',
  },
  metricIconSuccess: {
    backgroundColor: '#e8f2ea',
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
  metricHint: {
    color: palette.sageDark,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickCard: {
    width: '48.5%',
    backgroundColor: '#eef5ef',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
    padding: 14,
    gap: 6,
  },
  quickCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCardTitle: {
    color: palette.soil,
    fontSize: 14,
    fontWeight: '800',
  },
  quickCardText: {
    color: palette.sageDark,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  sectionIntro: {
    gap: 4,
  },
  sectionCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 12,
    ...shadow,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    color: palette.soil,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  inlineLink: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: palette.parchment,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineLinkText: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '800',
  },
  stack: {
    gap: 10,
  },
  inlineCard: {
    borderRadius: radii.sm,
    backgroundColor: '#fbfdfb',
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    gap: 6,
  },
  inlineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  inlineCardTitle: {
    flex: 1,
    color: palette.soil,
    fontSize: 14,
    fontWeight: '800',
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  codeMeta: {
    maxWidth: '52%',
    borderRadius: 6,
    backgroundColor: palette.parchment,
    color: palette.clay,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  smallInlineLink: {
    alignSelf: 'flex-start',
  },
  smallInlineLinkText: {
    color: palette.sageDark,
    fontSize: 12,
    fontWeight: '800',
  },
  reviewSectionHeader: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 10,
    ...shadow,
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
    textAlign: 'center',
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
  headerTextBlock: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    flex: 1,
    color: palette.soil,
    fontSize: 17,
    fontWeight: '800',
  },
  reviewImageFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radii.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.parchment,
  },
  reviewImage: {
    width: '100%',
    height: '100%',
  },
  reviewImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  reviewImageFallbackText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusWarning: {
    backgroundColor: '#f5ecd6',
  },
  statusWarningStrong: {
    backgroundColor: '#f1d99d',
  },
  statusPositive: {
    backgroundColor: '#e8f2ea',
  },
  statusNegative: {
    backgroundColor: '#f9e4df',
  },
  statusFatal: {
    backgroundColor: '#efc9c0',
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
  sellerMetaText: {
    color: palette.soil,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  metadataGrid: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#fbfdfb',
    padding: 12,
    gap: 10,
  },
  metadataItem: {
    gap: 2,
  },
  metadataLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metadataValue: {
    color: palette.soil,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  codeBox: {
    borderRadius: radii.sm,
    backgroundColor: palette.parchment,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
  },
  codeBoxText: {
    color: palette.clay,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
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
  noteHelper: {
    color: palette.error,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
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
  inlineAction: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: palette.parchment,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inlineActionText: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '800',
  },
  loadingText: {
    color: palette.muted,
    fontSize: 14,
    textAlign: 'center',
  },
})
