import * as Linking from 'expo-linking'
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
import { VerifiedBadge } from '../../components/VerifiedBadge'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import {
  getVerificationDocumentSignedUrl,
} from '../../services/storageService'
import {
  getAdminSellerVerificationRequests,
  updateAdminSellerVerificationStatus,
} from '../../services/sellerVerificationService'
import type {
  AdminSellerVerificationItem,
  SellerVerificationDocumentType,
  SellerVerificationRequestStatus,
} from '../../types/app'
import { palette, radii, shadow } from '../../utils/theme'

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

export default function AdminVerificationScreen() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const [items, setItems] = useState<AdminSellerVerificationItem[]>([])
  const [filter, setFilter] = useState<SellerVerificationRequestStatus | 'all'>('pending')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isActingOnId, setIsActingOnId] = useState<string | null>(null)
  const [notesById, setNotesById] = useState<Record<string, string>>({})

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

    const result = await getAdminSellerVerificationRequests()

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
    () => items.filter((item) => filter === 'all' || item.status === filter),
    [filter, items],
  )

  const handleOpenDocument = async (documentPath: string) => {
    const result = await getVerificationDocumentSignedUrl(documentPath)

    if (result.error || !result.data) {
      showToast(result.error?.message ?? 'Unable to open the uploaded document.', 'error')
      return
    }

    await Linking.openURL(result.data)
  }

  const handleUpdateStatus = async (
    item: AdminSellerVerificationItem,
    status: SellerVerificationRequestStatus,
  ) => {
    if (!user) {
      showToast('Sign in again before continuing admin review.', 'error')
      return
    }

    setIsActingOnId(item.id)
    const result = await updateAdminSellerVerificationStatus({
      requestId: item.id,
      sellerId: item.sellerId,
      status,
      adminNote: notesById[item.id] ?? item.adminNote,
      reviewerId: user.id,
    })
    setIsActingOnId(null)

    if (result.error) {
      showToast(result.error.message, 'error')
      return
    }

    showToast('Verification request updated.', 'success')
    void loadItems('refresh')
  }

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateWrap}>
          <EmptyState
            title="Admin access required"
            description="Only admin accounts can review seller verification requests."
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
            title="Verification reviews unavailable"
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
          <Text style={styles.title}>Seller verification reviews</Text>
          <Text style={styles.subtitle}>
            Approve or reject seller document submissions and control who receives a verified badge.
          </Text>
        </View>

        <View style={styles.filterRow}>
          {(['pending', 'approved', 'rejected', 'all'] as const).map((value) => (
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
            <Text style={styles.loadingText}>Loading verification requests...</Text>
          </View>
        ) : visibleItems.length === 0 ? (
          <EmptyState
            title="No matching verification requests"
            description="There are no seller verification requests in this filter right now."
          />
        ) : (
          visibleItems.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.headerRow}>
                <View style={styles.headerTextBlock}>
                  <Text style={styles.cardTitle}>{item.seller?.fullName ?? 'Unknown seller'}</Text>
                  <Text style={styles.cardMeta}>
                    {item.seller?.city ?? 'Location not provided'}
                    {item.seller?.email ? ` | ${item.seller.email}` : ''}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'approved'
                      ? styles.statusPositive
                      : item.status === 'rejected'
                        ? styles.statusNegative
                        : styles.statusWarning,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>{item.status}</Text>
                </View>
              </View>

              {item.status === 'approved' ? <VerifiedBadge /> : null}

              <Text style={styles.cardMeta}>
                Document: {DOCUMENT_LABELS[item.documentType] ?? 'Verification proof'}
              </Text>
              <Text style={styles.cardMeta}>Reference: {item.documentNumber}</Text>
              <Text style={styles.cardMeta}>Submitted: {formatTimestamp(item.createdAt)}</Text>
              {item.notes ? <Text style={styles.cardText}>{item.notes}</Text> : null}
              {item.adminNote ? (
                <Text style={styles.cardMeta}>Admin note: {item.adminNote}</Text>
              ) : null}
              {item.reviewedAt ? (
                <Text style={styles.cardMeta}>
                  Reviewed: {formatTimestamp(item.reviewedAt)}
                </Text>
              ) : null}

              <Pressable
                onPress={() => void handleOpenDocument(item.documentPath)}
                style={styles.inlineButton}
              >
                <Text style={styles.inlineButtonText}>Open document</Text>
              </Pressable>

              <TextInput
                value={notesById[item.id] ?? item.adminNote ?? ''}
                onChangeText={(value) =>
                  setNotesById((current) => ({ ...current, [item.id]: value }))
                }
                placeholder="Admin note"
                placeholderTextColor="#9e9183"
                multiline
                style={styles.noteInput}
              />

              <View style={styles.actionRow}>
                <Pressable
                  disabled={isActingOnId === item.id}
                  onPress={() => void handleUpdateStatus(item, 'approved')}
                  style={[styles.actionButton, styles.primaryAction]}
                >
                  <Text style={styles.primaryActionText}>Approve</Text>
                </Pressable>
                <Pressable
                  disabled={isActingOnId === item.id}
                  onPress={() => void handleUpdateStatus(item, 'rejected')}
                  style={[styles.actionButton, styles.warningAction]}
                >
                  <Text style={styles.warningActionText}>Reject</Text>
                </Pressable>
              </View>
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
    gap: 10,
    ...shadow,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTextBlock: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: palette.soil,
    fontSize: 17,
    fontWeight: '800',
  },
  cardMeta: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  cardText: {
    color: palette.soil,
    fontSize: 13,
    lineHeight: 20,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  statusWarning: {
    backgroundColor: '#f5ecd6',
  },
  statusPositive: {
    backgroundColor: '#e8f2ea',
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
  inlineButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: palette.parchment,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inlineButtonText: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '800',
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
