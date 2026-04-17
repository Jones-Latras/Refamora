import { useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ContactRequestCard } from '../../components/ContactRequestCard'
import { EmptyState } from '../../components/EmptyState'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import {
  getSellerInquiries,
  markSellerInquiriesSeen,
} from '../../services/contactService'
import { getListingCopilotAnalytics } from '../../services/aiService'
import { getFarmerListings } from '../../services/listingService'
import type {
  AIAnalyticsSummary,
  ContactRequestSummary,
  ListingPreview,
} from '../../types/app'
import { formatDate, formatPrice } from '../../utils/formatters'
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

function formatLatency(value: number | null) {
  if (value == null) {
    return '--'
  }

  if (value < 1000) {
    return `${value} ms`
  }

  return `${(value / 1000).toFixed(1)} s`
}

type MetricCardProps = {
  label: string
  value: string
  tone?: 'default' | 'attention'
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
  onEdit: () => void
}

function ListingPreviewCard({ listing, onEdit }: ListingPreviewCardProps) {
  return (
    <View style={styles.listingCard}>
      {listing.imageUrl ? (
        <Image source={{ uri: listing.imageUrl }} style={styles.listingImage} />
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

          <View
            style={[
              styles.statusPill,
              listing.status === 'active'
                ? styles.statusActive
                : listing.status === 'sold'
                  ? styles.statusSold
                  : styles.statusUnavailable,
            ]}
          >
            <Text style={styles.statusText}>{listing.status}</Text>
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
  const { profile } = useProfile(user?.id)
  const { showToast } = useToast()
  const [listings, setListings] = useState<ListingPreview[]>([])
  const [inquiries, setInquiries] = useState<ContactRequestSummary[]>([])
  const [aiAnalytics, setAiAnalytics] = useState<AIAnalyticsSummary | null>(null)

  const loadDashboard = useCallback(async () => {
    if (!user) {
      setListings([])
      setInquiries([])
      setAiAnalytics(null)
      return
    }

    const [listingsResult, inquiriesResult, analyticsResult] = await Promise.all([
      getFarmerListings(user.id),
      getSellerInquiries(user.id),
      getListingCopilotAnalytics(user.id),
    ])

    if (listingsResult.error) {
      showToast(listingsResult.error.message, 'error')
    }

    if (inquiriesResult.error) {
      showToast(inquiriesResult.error.message, 'error')
    }

    if (analyticsResult.error) {
      showToast(analyticsResult.error.message, 'error')
    }

    setListings(listingsResult.data ?? [])
    setInquiries(inquiriesResult.data ?? [])
    setAiAnalytics(analyticsResult.data)
  }, [showToast, user])

  useFocusEffect(
    useCallback(() => {
      void loadDashboard()
    }, [loadDashboard]),
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
  const profileIncomplete = useMemo(
    () => !profile?.phone || !profile?.city || !profile?.avatar_url,
    [profile],
  )

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
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>
                    {getInitials(profile?.full_name, user?.email ?? 'R')}
                  </Text>
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <View style={styles.avatarEditGlyph} />
                <View style={styles.avatarEditNib} />
              </View>
            </Pressable>

            <View style={styles.identityText}>
              <Text style={styles.greeting}>
                {getGreeting(profile?.full_name ?? user?.email)}
              </Text>
              <Text style={styles.headerSubtext}>
                Manage your listings and buyer inquiries.
              </Text>
              <Text style={styles.headerMeta}>
                {profile?.email ?? user?.email ?? 'No email'} | Verified seller
              </Text>
            </View>
          </View>

          {profileIncomplete ? (
            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>Complete your profile</Text>
              <Text style={styles.tipText}>
                Add your photo, phone number, and city so buyers can trust your
                listings faster.
              </Text>
              <Pressable
                onPress={() => router.push('/(farmer)/profile')}
                style={styles.tipAction}
              >
                <Text style={styles.tipActionText}>Finish profile</Text>
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

        <View style={styles.aiCard}>
          <View style={styles.aiCardHeader}>
            <View>
              <Text style={styles.aiCardTitle}>Listing copilot</Text>
              <Text style={styles.aiCardSubtitle}>
                Last {aiAnalytics?.periodDays ?? 7} days
              </Text>
            </View>
            <View style={styles.aiCardBadge}>
              <Text style={styles.aiCardBadgeText}>AI</Text>
            </View>
          </View>

          {aiAnalytics && aiAnalytics.totalRequests > 0 ? (
            <>
              <View style={styles.aiStatGrid}>
                <View style={styles.aiStatCell}>
                  <Text style={styles.aiStatValue}>
                    {aiAnalytics.totalRequests}
                  </Text>
                  <Text style={styles.aiStatLabel}>Requests</Text>
                </View>
                <View style={styles.aiStatCell}>
                  <Text style={styles.aiStatValue}>
                    {formatLatency(aiAnalytics.averageLatencyMs)}
                  </Text>
                  <Text style={styles.aiStatLabel}>Avg response</Text>
                </View>
                <View style={styles.aiStatCell}>
                  <Text style={styles.aiStatValue}>
                    {aiAnalytics.helpfulRate == null
                      ? '--'
                      : `${aiAnalytics.helpfulRate}%`}
                  </Text>
                  <Text style={styles.aiStatLabel}>Helpful rate</Text>
                </View>
                <View style={styles.aiStatCell}>
                  <Text style={styles.aiStatValue}>
                    {aiAnalytics.failedRequests}
                  </Text>
                  <Text style={styles.aiStatLabel}>Failed</Text>
                </View>
              </View>

              <Text style={styles.aiCardMeta}>
                Local Gemma {aiAnalytics.localGemmaRequests} | Gemini{' '}
                {aiAnalytics.geminiRequests} | Feedback {aiAnalytics.feedbackCount}
              </Text>
            </>
          ) : (
            <View style={styles.aiEmptyCard}>
              <Text style={styles.aiEmptyTitle}>No AI activity yet</Text>
              <Text style={styles.aiEmptyText}>
                Use Improve with AI while creating a listing to start tracking
                request volume, speed, and helpfulness.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.primaryActions}>
          <Pressable
            onPress={() => router.push('/(farmer)/create-listing')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>+ Create Listing</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(farmer)/my-listings')}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Manage Listings</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push('/(farmer)/requests')}
          style={styles.inboxShortcut}
        >
          <View style={styles.inboxShortcutText}>
            <Text style={styles.inboxShortcutTitle}>Inquiry inbox</Text>
            <Text style={styles.inboxShortcutSubtitle}>
              Open the seller inbox with AI summaries, draft replies, and
              response status tools.
            </Text>
          </View>
          <Text style={styles.inboxShortcutLink}>Open</Text>
        </Pressable>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent inquiries</Text>
              <Text style={styles.sectionSubtitle}>
                {pendingInquiryCount} pending request
                {pendingInquiryCount === 1 ? '' : 's'}
              </Text>
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
                />
              ))}
            </View>
          ) : (
            <EmptyState
              title="No inquiries yet"
              description="Buyers who message you about your listings will appear here."
              actionLabel={listings.length === 0 ? 'Create first listing' : undefined}
              onAction={
                listings.length === 0
                  ? () => router.push('/(farmer)/create-listing')
                  : undefined
              }
            />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Your listings</Text>
              <Text style={styles.sectionSubtitle}>
                {activeCount} active | {soldCount} sold
              </Text>
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
                  onEdit={() => router.push(`/(farmer)/edit-listing/${listing.id}`)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              title="No listings yet"
              description="Create your first listing to start receiving buyer inquiries."
              actionLabel="Create first listing"
              onAction={() => router.push('/(farmer)/create-listing')}
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
  avatarEditGlyph: {
    width: 10,
    height: 3,
    borderRadius: 2,
    backgroundColor: palette.cream,
    transform: [{ rotate: '-45deg' }],
  },
  avatarEditNib: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 0,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderLeftColor: palette.cream,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '-45deg' }],
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
  headerSubtext: {
    color: palette.muted,
    lineHeight: 20,
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
  aiCard: {
    backgroundColor: '#eef6ed',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
    padding: 16,
    gap: 14,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  aiCardTitle: {
    color: palette.sageDark,
    fontSize: 17,
    fontWeight: '800',
  },
  aiCardSubtitle: {
    color: '#5f7166',
    marginTop: 2,
    fontSize: 12,
  },
  aiCardBadge: {
    borderRadius: 999,
    backgroundColor: palette.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  aiCardBadgeText: {
    color: palette.sageDark,
    fontSize: 11,
    fontWeight: '800',
  },
  aiStatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  aiStatCell: {
    width: '47%',
    minHeight: 78,
    backgroundColor: palette.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.08)',
    padding: 12,
    justifyContent: 'space-between',
  },
  aiStatValue: {
    color: palette.soil,
    fontSize: 22,
    fontWeight: '900',
  },
  aiStatLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  aiCardMeta: {
    color: '#5f7166',
    fontSize: 12,
    lineHeight: 18,
  },
  aiEmptyCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.08)',
    padding: 14,
    gap: 4,
  },
  aiEmptyTitle: {
    color: palette.sageDark,
    fontSize: 14,
    fontWeight: '800',
  },
  aiEmptyText: {
    color: '#5f7166',
    fontSize: 13,
    lineHeight: 19,
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
  inboxShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#eef6ed',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  inboxShortcutText: {
    flex: 1,
    gap: 4,
  },
  inboxShortcutTitle: {
    color: palette.sageDark,
    fontSize: 15,
    fontWeight: '800',
  },
  inboxShortcutSubtitle: {
    color: '#5f7166',
    fontSize: 13,
    lineHeight: 19,
  },
  inboxShortcutLink: {
    color: palette.sageDark,
    fontSize: 13,
    fontWeight: '900',
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
  sectionSubtitle: {
    color: palette.muted,
    marginTop: 2,
    lineHeight: 18,
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
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusActive: {
    backgroundColor: '#dcebdc',
  },
  statusSold: {
    backgroundColor: '#e8e8e8',
  },
  statusUnavailable: {
    backgroundColor: '#f3ead1',
  },
  statusText: {
    color: palette.soil,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
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
