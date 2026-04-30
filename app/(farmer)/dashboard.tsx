import { useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AppImage } from '../../components/AppImage'
import { ContactRequestCard } from '../../components/ContactRequestCard'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { ListingStatusBadge } from '../../components/ListingStatusBadge'
import { DashboardScreenSkeleton } from '../../components/ScreenSkeleton'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { useListingDraftStore } from '../../hooks/useListingDrafts'
import { useProfile } from '../../hooks/useProfile'
import {
  getSellerInquiries,
  markSellerInquiriesSeen,
} from '../../services/contactService'
import {
  getFarmerListings,
  getSellerListingPerformance,
} from '../../services/listingService'
import type {
  ContactRequestSummary,
  ListingPerformanceSummary,
  ListingPreview,
} from '../../types/app'
import { formatDate, formatPrice } from '../../utils/formatters'
import { getProfileCompletion } from '../../utils/profileCompletion'
import { palette, radii, shadow } from '../../utils/theme'

function getGreeting(name?: string | null) {
  const hour = new Date().getHours()
  const normalizedName = name?.includes('@') ? name.split('@')[0] : name
  const firstName = normalizedName?.trim().split(/[\s._-]+/)[0]

  if (hour < 12) {
    return `Good morning${firstName ? `, ${firstName}` : ''}`
  }

  if (hour < 18) {
    return `Good afternoon${firstName ? `, ${firstName}` : ''}`
  }

  return `Good evening${firstName ? `, ${firstName}` : ''}`
}

function getInitials(name?: string | null, fallback = 'R') {
  if (!name) {
    return fallback.charAt(0).toUpperCase()
  }

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function getListingAgeInDays(createdAt: string) {
  const diffMs = Date.now() - new Date(createdAt).getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

type MetricCardProps = {
  label: string
  value: string
  tone?: 'default' | 'attention'
}

type ReminderItem = {
  id: string
  title: string
  description: string
  actionLabel: string
  onPress: () => void
}

function MetricCard({ label, value, tone = 'default' }: MetricCardProps) {
  return (
    <View
      style={[
        styles.metricCard,
        tone === 'attention' ? styles.metricCardAttention : null,
      ]}
    >
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {tone === 'attention' ? (
        <View style={styles.metricBadge}>
          <Text style={styles.metricBadgeText}>Needs attention</Text>
        </View>
      ) : null}
    </View>
  )
}

type ListingPreviewCardProps = {
  listing: ListingPreview
  performance?: ListingPerformanceSummary
  onEdit: () => void
}

function ListingPreviewCard({
  listing,
  performance,
  onEdit,
}: ListingPreviewCardProps) {
  return (
    <View style={styles.listingCard}>
      {listing.imageUrl ? (
        <AppImage uri={listing.imageUrl} style={styles.listingImage} />
      ) : (
        <View style={styles.listingImageFallback}>
          <Text style={styles.listingImageFallbackText}>{listing.wasteType}</Text>
        </View>
      )}

      <View style={styles.listingContent}>
        <View style={styles.listingHeader}>
          <View style={styles.listingTextBlock}>
            <Text numberOfLines={1} style={styles.listingTitle}>
              {listing.title}
            </Text>
            <Text style={styles.listingMeta}>
              {listing.wasteType} | {formatPrice(listing.price, listing.unit)}
            </Text>
          </View>

          <ListingStatusBadge status={listing.status} />
        </View>

        <View style={styles.listingPerformanceRow}>
          <View style={styles.listingPerformanceChip}>
            <Text style={styles.listingPerformanceValue}>
              {performance?.viewCount ?? 0}
            </Text>
            <Text style={styles.listingPerformanceLabel}>Views</Text>
          </View>
          <View style={styles.listingPerformanceChip}>
            <Text style={styles.listingPerformanceValue}>
              {performance?.inquiryCount ?? 0}
            </Text>
            <Text style={styles.listingPerformanceLabel}>Inquiries</Text>
          </View>
          <View style={styles.listingPerformanceChip}>
            <Text style={styles.listingPerformanceValue}>
              {performance?.pendingInquiryCount ?? 0}
            </Text>
            <Text style={styles.listingPerformanceLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.listingFooter}>
          <Text style={styles.listingDate}>Posted {formatDate(listing.createdAt)}</Text>
          <Pressable onPress={onEdit} style={styles.inlineAction}>
            <Text style={styles.inlineActionText}>Edit</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

export default function FarmerDashboardScreen() {
  const { user } = useAuth()
  const {
    profile,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useProfile(user?.id)
  const { showToast } = useToast()
  const savedDraft = useListingDraftStore((state) =>
    user?.id ? state.draftsByUser[user.id] ?? null : null,
  )
  const [listings, setListings] = useState<ListingPreview[]>([])
  const [inquiries, setInquiries] = useState<ContactRequestSummary[]>([])
  const [listingPerformance, setListingPerformance] = useState<
    ListingPerformanceSummary[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const isSellerVerified = profile?.is_verified === true

  const openCreateListing = useCallback(() => {
    router.push(
      isSellerVerified
        ? '/(farmer)/create-listing'
        : '/(shared)/seller-verification',
    )
  }, [isSellerVerified])

  const loadDashboard = useCallback(async () => {
    if (!user) {
      setListings([])
      setInquiries([])
      setListingPerformance([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)
    const [listingsResult, inquiriesResult, performanceResult] =
      await Promise.all([
        getFarmerListings(user.id),
        getSellerInquiries(user.id),
        getSellerListingPerformance(user.id),
      ])

    if (listingsResult.error) {
      showToast(listingsResult.error.message, 'error')
    }

    if (inquiriesResult.error) {
      showToast(inquiriesResult.error.message, 'error')
    }

    if (performanceResult.error) {
      showToast(performanceResult.error.message, 'error')
    }

    if (
      listingsResult.error &&
      inquiriesResult.error &&
      performanceResult.error
    ) {
      setLoadError('Seller dashboard could not be loaded right now.')
    }

    setListings(listingsResult.data ?? [])
    setInquiries(inquiriesResult.data ?? [])
    setListingPerformance(performanceResult.data ?? [])
    setIsLoading(false)
  }, [showToast, user])

  useFocusEffect(
    useCallback(() => {
      void refetchProfile().catch(() => undefined)
      void loadDashboard()
    }, [loadDashboard, refetchProfile]),
  )

  const handleMarkAllSeen = async () => {
    if (!user) {
      return
    }

    const result = await markSellerInquiriesSeen(user.id)

    if (result.error) {
      showToast(result.error.message, 'error')
      return
    }

    setInquiries((current) =>
      current.map((item) => ({
        ...item,
        status: 'seen',
      })),
    )
    showToast('Inquiries marked as seen.', 'success')
  }

  const activeCount = useMemo(
    () => listings.filter((listing) => listing.status === 'active').length,
    [listings],
  )
  const soldCount = useMemo(
    () => listings.filter((listing) => listing.status === 'sold').length,
    [listings],
  )
  const pendingInquiryCount = useMemo(
    () => inquiries.filter((request) => request.status === 'pending').length,
    [inquiries],
  )
  const profileCompletion = useMemo(
    () => getProfileCompletion(profile, 'farmer'),
    [profile],
  )
  const performanceByListing = useMemo(
    () => new Map(listingPerformance.map((item) => [item.listingId, item])),
    [listingPerformance],
  )
  const totalViews = useMemo(
    () => listingPerformance.reduce((sum, item) => sum + item.viewCount, 0),
    [listingPerformance],
  )
  const totalInquiries = useMemo(
    () => listingPerformance.reduce((sum, item) => sum + item.inquiryCount, 0),
    [listingPerformance],
  )
  const strongestListing = useMemo(() => {
    if (listingPerformance.length === 0) {
      return null
    }

    return [...listingPerformance].sort((left, right) => {
      const leftScore = left.viewCount + left.inquiryCount * 3
      const rightScore = right.viewCount + right.inquiryCount * 3

      return rightScore - leftScore
    })[0]
  }, [listingPerformance])
  const strongestListingTitle = useMemo(
    () => listings.find((listing) => listing.id === strongestListing?.listingId)?.title ?? null,
    [listings, strongestListing?.listingId],
  )
  const staleListings = useMemo(
    () =>
      listings.filter((listing) => {
        if (listing.status !== 'active') {
          return false
        }

        const ageInDays = getListingAgeInDays(listing.createdAt)
        const performance = performanceByListing.get(listing.id)

        if (ageInDays < 14) {
          return false
        }

        return (performance?.inquiryCount ?? 0) === 0 || (performance?.viewCount ?? 0) <= 3
      }),
    [listings, performanceByListing],
  )
  const dashboardReminders = useMemo<ReminderItem[]>(() => {
    const reminders: ReminderItem[] = []

    if (!profileCompletion.isComplete) {
      const missingPreview = profileCompletion.missingLabels.slice(0, 2).join(', ')
      reminders.push({
        id: 'profile',
        title: 'Complete your seller profile',
        description: missingPreview
          ? `Still missing: ${missingPreview}${
              profileCompletion.remainingCount > 2 ? ' and more' : ''
            }.`
          : profileCompletion.summary,
        actionLabel: profileCompletion.nextActionLabel,
        onPress: () => router.push('/(farmer)/profile'),
      })
    }

    if (savedDraft) {
      reminders.push({
        id: 'draft',
        title: 'Resume your saved draft',
        description: `Continue editing "${
          savedDraft.values.title.trim() || 'Untitled listing draft'
        }" without starting over.`,
        actionLabel: 'Open draft',
        onPress: openCreateListing,
      })
    }

    if (profile && !isSellerVerified) {
      reminders.push({
        id: 'seller-verification',
        title: 'Verify before posting',
        description:
          'Submit your seller verification document and wait for approval before publishing products.',
        actionLabel: 'Start verification',
        onPress: () => router.push('/(shared)/seller-verification'),
      })
    }

    if (pendingInquiryCount > 0) {
      reminders.push({
        id: 'pending-inquiries',
        title: 'Reply to new buyer inquiries',
        description: `${pendingInquiryCount} buyer inquiry${
          pendingInquiryCount === 1 ? '' : 'ies'
        } still need attention in your inbox.`,
        actionLabel: 'Open messages',
        onPress: () => router.push('/(farmer)/requests'),
      })
    }

    if (staleListings.length > 0) {
      const targetListing = staleListings[0]
      const ageInDays = getListingAgeInDays(targetListing.createdAt)

      reminders.push({
        id: 'stale-listing',
        title: 'Refresh a stale listing',
        description: `${targetListing.title} has been active for ${ageInDays} day${
          ageInDays === 1 ? '' : 's'
        } with low activity.`,
        actionLabel: 'Edit listing',
        onPress: () => router.push(`/(farmer)/edit-listing/${targetListing.id}`),
      })
    }

    if (activeCount === 0 && listings.length > 0) {
      reminders.push({
        id: 'no-active-listings',
        title: 'Bring a listing back online',
        description:
          'You have listings, but none are active right now. Reactivate one so buyers can find you.',
        actionLabel: 'Manage listings',
        onPress: () => router.push('/(farmer)/my-listings'),
      })
    }

    return reminders.slice(0, 3)
  }, [
    activeCount,
    listings.length,
    pendingInquiryCount,
    profileCompletion,
    profile,
    isSellerVerified,
    openCreateListing,
    savedDraft,
    staleListings,
  ])

  const shouldShowSkeleton =
    (!profile && isProfileLoading) ||
    (isLoading &&
      listings.length === 0 &&
      inquiries.length === 0 &&
      listingPerformance.length === 0)

  if (shouldShowSkeleton) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
        <DashboardScreenSkeleton />
      </SafeAreaView>
    )
  }

  if (
    loadError &&
    listings.length === 0 &&
    inquiries.length === 0 &&
    listingPerformance.length === 0
  ) {
    return (
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.errorWrapper}>
          <ErrorState
            title="Dashboard could not be loaded"
            description="Refamora could not load your seller activity right now. Try again to refresh the dashboard."
            onAction={() => {
              void loadDashboard()
            }}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.identityRow}>
            <Pressable
              accessibilityLabel="Open profile"
              onPress={() => router.push('/(farmer)/profile')}
              style={styles.avatarPressable}
            >
              {profile?.avatar_url ? (
                <AppImage uri={profile.avatar_url} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>
                    {getInitials(profile?.full_name, user?.email ?? 'R')}
                  </Text>
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Feather name="edit-2" size={12} color={palette.cream} style={{ marginLeft: 1 }} />
              </View>
            </Pressable>

            <View style={styles.identityText}>
              <Text style={styles.greeting}>
                {getGreeting(profile?.full_name ?? user?.email)}
              </Text>
              <Text style={styles.headerMeta}>
                {profile?.email ?? user?.email ?? 'No email'} |{' '}
                {isSellerVerified ? 'Verified seller' : 'Verification required'}
              </Text>
            </View>
          </View>

          {!profileCompletion.isComplete ? (
            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>{profileCompletion.title}</Text>
              <Text style={styles.tipText}>
                {profileCompletion.completedCount} of {profileCompletion.items.length} details
                complete. {profileCompletion.summary}
              </Text>
              <Text style={styles.tipMeta}>
                Missing: {profileCompletion.missingLabels.join(', ')}
              </Text>
              <Pressable
                onPress={() => router.push('/(farmer)/profile')}
                style={styles.tipAction}
              >
                <Text style={styles.tipActionText}>{profileCompletion.nextActionLabel}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.metricRow}>
          <MetricCard label="Active listings" value={activeCount.toString()} />
          <MetricCard
            label="New inquiries"
            value={pendingInquiryCount.toString()}
            tone={pendingInquiryCount > 0 ? 'attention' : 'default'}
          />
          <MetricCard label="Sold items" value={soldCount.toString()} />
        </View>

        {dashboardReminders.length > 0 ? (
          <View style={styles.reminderCard}>
            <View style={styles.reminderHeader}>
              <Text style={styles.reminderTitle}>Needs your attention</Text>
            </View>

            <View style={styles.reminderStack}>
              {dashboardReminders.map((reminder) => (
                <View key={reminder.id} style={styles.reminderItem}>
                  <View style={styles.reminderText}>
                    <Text style={styles.reminderItemTitle}>{reminder.title}</Text>
                    <Text style={styles.reminderItemDescription}>
                      {reminder.description}
                    </Text>
                  </View>
                  <Pressable onPress={reminder.onPress} style={styles.reminderAction}>
                    <Text style={styles.reminderActionText}>{reminder.actionLabel}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.performanceCard}>
          <View style={styles.performanceHeader}>
            <View>
              <Text style={styles.performanceTitle}>Listing performance</Text>
            </View>
            <Pressable onPress={() => router.push('/(farmer)/my-listings')}>
              <Text style={styles.linkText}>Open listings</Text>
            </Pressable>
          </View>

          <View style={styles.performanceStatRow}>
            <View style={styles.performanceStatCard}>
              <Text style={styles.performanceStatValue}>{totalViews}</Text>
              <Text style={styles.performanceStatLabel}>Total views</Text>
            </View>
            <View style={styles.performanceStatCard}>
              <Text style={styles.performanceStatValue}>{totalInquiries}</Text>
              <Text style={styles.performanceStatLabel}>Total inquiries</Text>
            </View>
          </View>

          {strongestListing && strongestListingTitle ? (
            <View style={styles.performanceHighlight}>
              <Text style={styles.performanceHighlightLabel}>Top listing right now</Text>
              <Text style={styles.performanceHighlightTitle}>{strongestListingTitle}</Text>
              <Text style={styles.performanceHighlightMeta}>
                {strongestListing.viewCount} views | {strongestListing.inquiryCount} inquiries
              </Text>
            </View>
          ) : (
            <Text style={styles.performanceEmptyText}>
              Listing views will appear here once buyers start opening your listings.
            </Text>
          )}
        </View>

        <View style={styles.primaryActions}>
          <Pressable
            onPress={openCreateListing}
            style={[styles.primaryButton, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
          >
            <Feather
              name={isSellerVerified ? 'plus-circle' : 'shield'}
              size={16}
              color={palette.cream}
            />
            <Text style={styles.primaryButtonText}>
              {isSellerVerified ? 'Create Listing' : 'Verify to Post'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(farmer)/my-listings')}
            style={[styles.secondaryButton, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
          >
            <Feather name="list" size={16} color={palette.clay} />
            <Text style={styles.secondaryButtonText}>Manage Listings</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="message-square" size={18} color={palette.soil} />
              <Text style={styles.sectionTitle}>Recent messages</Text>
            </View>
            <View style={styles.sectionActions}>
              <Pressable onPress={() => router.push('/(farmer)/requests')}>
                <Text style={styles.linkText}>View all</Text>
              </Pressable>
              {pendingInquiryCount > 0 ? (
                <Pressable onPress={() => void handleMarkAllSeen()}>
                  <Text style={styles.linkText}>Mark all seen</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {inquiries.length > 0 ? (
            <View style={styles.stack}>
              {inquiries.slice(0, 2).map((inquiry) => (
                <ContactRequestCard
                  key={inquiry.id}
                  request={inquiry}
                  role="seller"
                  onPress={() => router.push(`/(shared)/conversation/${inquiry.id}`)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              title="No messages yet"
              description={
                listings.length === 0
                  ? 'You do not have a live listing yet. Publish one first so buyers can start messaging you.'
                  : 'Your listings are live, but no buyer has reached out yet. New conversations will appear here as soon as someone contacts you.'
              }
              actionLabel={listings.length === 0 ? 'Create first listing' : undefined}
              onAction={
                listings.length === 0
                  ? openCreateListing
                  : undefined
              }
            />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="grid" size={18} color={palette.soil} />
              <Text style={styles.sectionTitle}>Your listings</Text>
            </View>
            <Pressable onPress={() => router.push('/(farmer)/my-listings')}>
              <Text style={styles.linkText}>View all</Text>
            </Pressable>
          </View>

          {listings.length > 0 ? (
            <View style={styles.stack}>
              {listings.slice(0, 3).map((listing) => (
                <ListingPreviewCard
                  key={listing.id}
                  listing={listing}
                  performance={performanceByListing.get(listing.id)}
                  onEdit={() => router.push(`/(farmer)/edit-listing/${listing.id}`)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              title="No listings yet"
              description={
                isSellerVerified
                  ? 'Create your first listing to start receiving buyer inquiries.'
                  : 'Verify your seller profile before publishing your first listing.'
              }
              actionLabel={isSellerVerified ? 'Create first listing' : 'Start verification'}
              onAction={openCreateListing}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8faf7',
  },
  content: {
    padding: 20,
    gap: 20,
  },
  errorWrapper: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    gap: 16,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPressable: {
    position: 'relative',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dfe6dd',
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: palette.cream,
    fontSize: 18,
    fontWeight: '800',
  },
  avatarEditBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.soil,
    borderWidth: 2,
    borderColor: '#f8faf7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  identityText: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    color: palette.soil,
    fontSize: 24,
    fontWeight: '800',
  },
  headerMeta: {
    color: '#6e7c72',
    fontSize: 12,
    lineHeight: 18,
  },
  tipCard: {
    backgroundColor: '#eef6ed',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
    padding: 16,
    gap: 6,
  },
  tipTitle: {
    color: palette.sageDark,
    fontWeight: '800',
    fontSize: 15,
  },
  tipText: {
    color: palette.sageDark,
    lineHeight: 20,
  },
  tipMeta: {
    color: '#5f7166',
    fontSize: 12,
    lineHeight: 18,
  },
  tipAction: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: palette.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  tipActionText: {
    color: palette.sageDark,
    fontWeight: '800',
    fontSize: 13,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minHeight: 108,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    justifyContent: 'space-between',
    ...shadow,
  },
  metricCardAttention: {
    borderColor: 'rgba(176, 126, 40, 0.28)',
    backgroundColor: '#fffaf1',
  },
  metricValue: {
    color: palette.soil,
    fontSize: 30,
    fontWeight: '900',
  },
  metricLabel: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  metricBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#f5e6c4',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metricBadgeText: {
    color: palette.clay,
    fontSize: 11,
    fontWeight: '800',
  },
  reminderCard: {
    backgroundColor: '#fff7ea',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(176, 126, 40, 0.2)',
    padding: 16,
    gap: 14,
    ...shadow,
  },
  reminderHeader: {
    gap: 4,
  },
  reminderTitle: {
    color: palette.soil,
    fontSize: 17,
    fontWeight: '800',
  },
  reminderStack: {
    gap: 10,
  },
  reminderItem: {
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(176, 126, 40, 0.12)',
    padding: 12,
  },
  reminderText: {
    gap: 4,
  },
  reminderItemTitle: {
    color: palette.soil,
    fontSize: 14,
    fontWeight: '800',
  },
  reminderItemDescription: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  reminderAction: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reminderActionText: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '800',
  },
  performanceCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 14,
    ...shadow,
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  performanceTitle: {
    color: palette.soil,
    fontSize: 17,
    fontWeight: '800',
  },
  performanceStatRow: {
    flexDirection: 'row',
    gap: 10,
  },
  performanceStatCard: {
    flex: 1,
    minHeight: 88,
    backgroundColor: '#f6f8f5',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    justifyContent: 'space-between',
  },
  performanceStatValue: {
    color: palette.soil,
    fontSize: 24,
    fontWeight: '900',
  },
  performanceStatLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  performanceHighlight: {
    backgroundColor: '#eef6ed',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
    padding: 14,
    gap: 4,
  },
  performanceHighlightLabel: {
    color: palette.sageDark,
    fontSize: 12,
    fontWeight: '800',
  },
  performanceHighlightTitle: {
    color: palette.soil,
    fontSize: 16,
    fontWeight: '800',
  },
  performanceHighlightMeta: {
    color: palette.muted,
    fontSize: 13,
  },
  performanceEmptyText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: palette.sage,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 15,
    ...shadow,
  },
  primaryButtonText: {
    color: palette.cream,
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    paddingVertical: 13,
  },
  secondaryButtonText: {
    color: palette.clay,
    fontWeight: '800',
    fontSize: 14,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  sectionTitle: {
    color: palette.soil,
    fontSize: 18,
    fontWeight: '800',
  },
  linkText: {
    color: palette.sageDark,
    fontWeight: '800',
    fontSize: 13,
  },
  stack: {
    gap: 12,
  },
  listingCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    ...shadow,
  },
  listingImage: {
    width: 72,
    height: 72,
    borderRadius: radii.sm,
    backgroundColor: '#e6ece4',
  },
  listingImageFallback: {
    width: 72,
    height: 72,
    borderRadius: radii.sm,
    backgroundColor: '#e6ece4',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  listingImageFallbackText: {
    color: palette.clay,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  listingContent: {
    flex: 1,
    gap: 8,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'flex-start',
  },
  listingTextBlock: {
    flex: 1,
    gap: 2,
  },
  listingTitle: {
    color: palette.soil,
    fontSize: 15,
    fontWeight: '800',
  },
  listingMeta: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  listingPerformanceRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  listingPerformanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#f2f6f1',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  listingPerformanceValue: {
    color: palette.soil,
    fontSize: 12,
    fontWeight: '900',
  },
  listingPerformanceLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  listingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  listingDate: {
    color: palette.muted,
    fontSize: 12,
  },
  inlineAction: {
    borderRadius: 999,
    backgroundColor: palette.parchment,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineActionText: {
    color: palette.clay,
    fontWeight: '800',
    fontSize: 12,
  },
})
