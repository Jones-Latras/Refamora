import { router, useLocalSearchParams } from 'expo-router'
import * as ExpoLinking from 'expo-linking'
import { useEffect, useMemo, useState } from 'react'
import MapView, { Marker } from 'react-native-maps'
import {
  Image,
  Linking,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ContactSellerModal } from '../../../components/ContactSellerModal'
import { EmptyState } from '../../../components/EmptyState'
import { FulfillmentLabel } from '../../../components/FulfillmentLabel'
import { ListingCard } from '../../../components/ListingCard'
import { ListingReportModal } from '../../../components/ListingReportModal'
import { ListingStatusBadge } from '../../../components/ListingStatusBadge'
import { ListingDetailScreenSkeleton } from '../../../components/ScreenSkeleton'
import { useToast } from '../../../components/Toast'
import { useAuth } from '../../../hooks/useAuth'
import { useBuyerLocationStore } from '../../../hooks/useBuyerLocation'
import { useRecentlyViewedStore } from '../../../hooks/useRecentlyViewed'
import { useSavedListingsStore } from '../../../hooks/useSavedListings'
import {
  getBuyerContactRequests,
  sendContactRequest,
} from '../../../services/contactService'
import { requestCurrentCoordinates } from '../../../services/locationService'
import {
  getListingById,
  getRelatedListings,
  recordListingView,
} from '../../../services/listingService'
import { submitListingReport } from '../../../services/listingReportService'
import type { ListingDetail, ListingPreview } from '../../../types/app'
import { formatDate, formatPrice, titleCase } from '../../../utils/formatters'
import { formatDistanceAway, getDistanceKm } from '../../../utils/location'
import { palette, radii, shadow } from '../../../utils/theme'

function getAvatarInitials(name?: string | null) {
  if (!name) {
    return 'AG'
  }

  const parts = name.split(' ').filter(Boolean)

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function formatRelativePostedDate(value: string) {
  const createdAt = new Date(value)
  const now = Date.now()
  const diffMs = Math.max(now - createdAt.getTime(), 0)
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) {
    return 'Posted just now'
  }

  if (diffHours < 24) {
    return `Posted ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  }

  if (diffDays < 7) {
    return `Posted ${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  }

  return `Posted on ${formatDate(value)}`
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const addRecentlyViewed = useRecentlyViewedStore((state) => state.addListing)
  const buyerCoordinates = useBuyerLocationStore((state) => state.coordinates)
  const setBuyerCoordinates = useBuyerLocationStore((state) => state.setCoordinates)
  const savedListingIds = useSavedListingsStore((state) => state.listingIds)
  const toggleSavedListing = useSavedListingsStore((state) => state.toggleListing)
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLocationLoading, setIsLocationLoading] = useState(false)
  const [isContactModalVisible, setIsContactModalVisible] = useState(false)
  const [contactMessage, setContactMessage] = useState('')
  const [isSubmittingContact, setIsSubmittingContact] = useState(false)
  const [hasRequestedContact, setHasRequestedContact] = useState(false)
  const [relatedListings, setRelatedListings] = useState<ListingPreview[]>([])
  const [isReportModalVisible, setIsReportModalVisible] = useState(false)
  const [reportReason, setReportReason] = useState<
    'inaccurate_details' | 'suspicious_listing' | 'wrong_photo' | 'spam' | 'other'
  >('inaccurate_details')
  const [reportDetails, setReportDetails] = useState('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadListing = async () => {
      if (!id) {
        if (isMounted) {
          setListing(null)
          setIsLoading(false)
        }
        return
      }

      setIsLoading(true)
      const result = await getListingById(id)

      if (!isMounted) {
        return
      }

      if (result.error) {
        showToast(result.error.message, 'error')
      }

      setListing(result.data)
      setIsLoading(false)
    }

    void loadListing()

    return () => {
      isMounted = false
    }
  }, [id, showToast])

  useEffect(() => {
    let isMounted = true

    const loadContactState = async () => {
      if (!user || role !== 'buyer' || !listing) {
        if (isMounted) {
          setHasRequestedContact(false)
        }
        return
      }

      const result = await getBuyerContactRequests(user.id)

      if (!isMounted) {
        return
      }

      setHasRequestedContact(
        (result.data ?? []).some((request) => request.listingId === listing.id),
      )
    }

    void loadContactState()

    return () => {
      isMounted = false
    }
  }, [listing, role, user])

  useEffect(() => {
    if (role !== 'buyer' || !listing) {
      return
    }

    addRecentlyViewed(listing.id)
  }, [addRecentlyViewed, listing, role])

  useEffect(() => {
    if (!user || role !== 'buyer' || !listing) {
      return
    }

    void recordListingView({
      listingId: listing.id,
      buyerId: user.id,
    })
  }, [listing, role, user])

  useEffect(() => {
    let isMounted = true

    const loadRelatedListings = async () => {
      if (!listing) {
        if (isMounted) {
          setRelatedListings([])
        }
        return
      }

      const result = await getRelatedListings({
        listingId: listing.id,
        wasteType: listing.wasteType,
        city: listing.city,
      })

      if (!isMounted) {
        return
      }

      if (result.error) {
        setRelatedListings([])
        return
      }

      setRelatedListings(result.data ?? [])
    }

    void loadRelatedListings()

    return () => {
      isMounted = false
    }
  }, [listing])

  const readableWasteType = useMemo(() => {
    if (!listing) {
      return ''
    }

    return titleCase(listing.wasteType.replace(/_/g, ' '))
  }, [listing])
  const locationDistanceLabel = useMemo(() => {
    if (
      !buyerCoordinates ||
      !listing ||
      listing.latitude == null ||
      listing.longitude == null
    ) {
      return null
    }

    return formatDistanceAway(
      getDistanceKm(buyerCoordinates, {
        latitude: listing.latitude,
        longitude: listing.longitude,
      }),
    )
  }, [buyerCoordinates, listing])

  const canContactSeller =
    role === 'buyer' && !!user && !!listing && user.id !== listing.sellerId
  const canSaveListing = role !== 'farmer'
  const isSaved = listing ? savedListingIds.includes(listing.id) : false
  const postedLabel = listing ? formatRelativePostedDate(listing.createdAt) : ''
  const sellerTrustSummary = useMemo(() => {
    if (!listing?.seller) {
      return null
    }

    return listing.seller.isProfileComplete
      ? {
          title: 'Trusted seller profile',
          description:
            'This seller has shared a photo, location, and contact details for smoother coordination.',
        }
      : {
          title: 'Seller profile still in progress',
          description:
            'Some trust details are still missing, but you can still review the listing and send a request.',
        }
  }, [listing?.seller])

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back()
      return
    }

    if (!user) {
      router.replace('/(auth)/login')
      return
    }

    router.replace(role === 'farmer' ? '/(farmer)/dashboard' : '/(buyer)/feed')
  }

  const handleShareListing = async () => {
    if (!listing) {
      return
    }

    const listingUrl = ExpoLinking.createURL(`/listing/${listing.id}`)

    try {
      await Share.share({
        message: `Check this Refamora listing: ${listing.title}\n${listingUrl}`,
        url: listingUrl,
        title: listing.title,
      })
    } catch {
      showToast('Unable to open the share sheet right now.', 'error')
    }
  }

  const handleToggleSavedListing = () => {
    if (!listing) {
      return
    }

    const nextSaved = toggleSavedListing(listing.id)
    showToast(
      nextSaved ? 'Listing saved for later.' : 'Listing removed from saved.',
      'success',
    )
  }

  const handleUseMyLocation = async () => {
    setIsLocationLoading(true)

    const result = await requestCurrentCoordinates()

    setIsLocationLoading(false)

    if (result.error || !result.data) {
      showToast(
        result.error?.message ?? 'Unable to get your current location right now.',
        'error',
      )
      return
    }

    setBuyerCoordinates(result.data)
    showToast('Distance estimates are now available for mapped listings.', 'success')
  }

  const handleSubmitContactRequest = async () => {
    if (!user || !listing) {
      showToast('Sign in before contacting a seller.', 'error')
      return
    }

    setIsSubmittingContact(true)

    const result = await sendContactRequest({
      listing_id: listing.id,
      buyer_id: user.id,
      seller_id: listing.sellerId,
      message: contactMessage.trim() || null,
    })

    setIsSubmittingContact(false)

    if (result.error) {
      showToast(result.error.message, 'error')
      return
    }

    setHasRequestedContact(true)
    setContactMessage('')
    setIsContactModalVisible(false)

    if (listing.seller?.phone) {
      showToast({
        title: 'Inquiry sent',
        message: 'Your request reached the seller. Their phone number is now visible below.',
        variant: 'success',
      })
      return
    }

    showToast({
      title: 'Inquiry sent',
      message: 'Your request reached the seller. They have not added a phone number yet.',
      variant: 'info',
    })
  }

  const handleContactPress = async () => {
    if (!listing?.seller?.phone || !hasRequestedContact) {
      setIsContactModalVisible(true)
      return
    }

    const supported = await Linking.canOpenURL(`tel:${listing.seller.phone}`)

    if (!supported) {
      showToast('Calling is not available on this device.', 'error')
      return
    }

    await Linking.openURL(`tel:${listing.seller.phone}`)
  }

  const handleOpenReport = () => {
    if (!listing) {
      return
    }

    if (!user) {
      router.push({
        pathname: '/(auth)/login',
        params: { redirect: `/(shared)/listing/${listing.id}` },
      })
      return
    }

    if (user.id === listing.sellerId) {
      showToast('You cannot report your own listing.', 'info')
      return
    }

    setIsReportModalVisible(true)
  }

  const handleSubmitReport = async () => {
    if (!user || !listing) {
      showToast('Sign in before reporting a listing.', 'error')
      return
    }

    setIsSubmittingReport(true)

    const result = await submitListingReport({
      listing_id: listing.id,
      reporter_id: user.id,
      seller_id: listing.sellerId,
      reason: reportReason,
      details: reportDetails.trim() || null,
    })

    setIsSubmittingReport(false)

    if (result.error) {
      showToast(result.error.message, 'error')
      return
    }

    setIsReportModalVisible(false)
    setReportReason('inaccurate_details')
    setReportDetails('')
    showToast('Report submitted. Refamora can review this listing now.', 'success')
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <ListingDetailScreenSkeleton />
      </SafeAreaView>
    )
  }

  if (!listing) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.emptyWrapper}>
          <EmptyState
            title="Listing not available"
            description="This listing could not be loaded or may no longer be active."
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          canContactSeller ? styles.contentWithFooter : null,
        ]}
      >
        <View style={styles.topBar}>
          <Pressable onPress={handleBackPress} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        </View>

        {listing.imageUrl ? (
          <Image source={{ uri: listing.imageUrl }} style={styles.heroImage} />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroPlaceholderLabel}>{readableWasteType}</Text>
          </View>
        )}

        <View style={styles.heroContent}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.eyebrow}>{readableWasteType}</Text>
              <Text style={styles.title}>{listing.title}</Text>
              <Text style={styles.price}>
                {formatPrice(listing.price, listing.unit)}
              </Text>
            </View>
            <View style={styles.heroActions}>
              {canSaveListing ? (
                <Pressable
                  onPress={handleToggleSavedListing}
                  style={[styles.shareButton, isSaved ? styles.savedButton : null]}
                >
                  <Text
                    style={[
                      styles.shareButtonText,
                      isSaved ? styles.savedButtonText : null,
                    ]}
                  >
                    {isSaved ? 'Saved' : 'Save'}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => void handleShareListing()}
                style={styles.shareButton}
              >
                <Text style={styles.shareButtonText}>Share</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.heroBadgeRow}>
            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeText}>{postedLabel}</Text>
            </View>
            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeText}>{titleCase(listing.status)}</Text>
            </View>
            {locationDistanceLabel ? (
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeText}>{locationDistanceLabel}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.meta}>
            {listing.city} | {listing.quantity} {listing.unit} | {formatDate(listing.createdAt)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this listing</Text>
          <Text style={styles.sectionText}>
            {listing.description ?? 'No description added yet.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fulfillment</Text>
            <FulfillmentLabel type={listing.fulfillmentType} />
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Offers</Text>
            <Text style={styles.detailValue}>
              {listing.acceptOffers ? 'Seller accepts offers' : 'Fixed price'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <ListingStatusBadge status={listing.status} />
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address</Text>
            <Text style={styles.detailValue}>
              {listing.address ?? 'Address not provided'}
            </Text>
          </View>
        </View>

        {listing.latitude != null && listing.longitude != null ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.sectionText}>
              {listing.address ?? `${listing.city} listing location`}
            </Text>
            {locationDistanceLabel ? (
              <Text style={styles.locationDistance}>{locationDistanceLabel}</Text>
            ) : role !== 'farmer' ? (
              <Pressable onPress={() => void handleUseMyLocation()} style={styles.locationAction}>
                <Text style={styles.locationActionText}>
                  {isLocationLoading
                    ? 'Getting your location...'
                    : 'Use my location to estimate distance'}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() =>
                void Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${listing.latitude},${listing.longitude}`,
                )
              }
            >
              <MapView
                pointerEvents="none"
                style={styles.locationMap}
                initialRegion={{
                  latitude: listing.latitude,
                  longitude: listing.longitude,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: listing.latitude,
                    longitude: listing.longitude,
                  }}
                />
              </MapView>
            </Pressable>
            <Text style={styles.mapHint}>Tap the map to open the exact location.</Text>
          </View>
        ) : null}

        <View style={styles.sellerSection}>
          <Text style={styles.sectionTitle}>Seller trust</Text>
          {listing.seller ? (
            <>
              <View style={styles.sellerRow}>
                {listing.seller.avatarUrl ? (
                  <Image
                    source={{ uri: listing.seller.avatarUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>
                      {getAvatarInitials(listing.seller.fullName)}
                    </Text>
                  </View>
                )}
                <View style={styles.sellerMeta}>
                  <Text style={styles.sellerName}>{listing.seller.fullName}</Text>
                  <Text style={styles.sellerLocation}>
                    {listing.seller.city ?? 'Location not provided'}
                  </Text>
                  <View style={styles.sellerBadgeRow}>
                    <View
                      style={[
                        styles.sellerBadge,
                        listing.seller.isProfileComplete
                          ? styles.sellerBadgePositive
                          : styles.sellerBadgeNeutral,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sellerBadgeText,
                          listing.seller.isProfileComplete
                            ? styles.sellerBadgeTextPositive
                            : null,
                        ]}
                      >
                        {listing.seller.isProfileComplete ? 'Profile ready' : 'Profile improving'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.sellerBadge,
                        listing.seller.phone
                          ? styles.sellerBadgePositive
                          : styles.sellerBadgeNeutral,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sellerBadgeText,
                          listing.seller.phone ? styles.sellerBadgeTextPositive : null,
                        ]}
                      >
                        {listing.seller.phone ? 'Phone on file' : 'No phone yet'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {sellerTrustSummary ? (
                <View
                  style={[
                    styles.sellerTrustSummaryCard,
                    listing.seller.isProfileComplete
                      ? styles.sellerTrustSummaryCardPositive
                      : null,
                  ]}
                >
                  <Text style={styles.sellerTrustSummaryTitle}>
                    {sellerTrustSummary.title}
                  </Text>
                  <Text style={styles.sellerTrustSummaryText}>
                    {sellerTrustSummary.description}
                  </Text>
                  <Text style={styles.sellerVerificationHint}>
                    Optional seller verification is coming in a later update after manual admin
                    review is added.
                  </Text>
                </View>
              ) : null}

              <View style={styles.sellerTrustGrid}>
                <View style={styles.sellerTrustCard}>
                  <Text style={styles.sellerTrustValue}>
                    {listing.seller.profileCompletionPercent}%
                  </Text>
                  <Text style={styles.sellerTrustLabel}>Profile complete</Text>
                </View>
                <View style={styles.sellerTrustCard}>
                  <Text style={styles.sellerTrustValue}>
                    {listing.seller.listingCount ?? 0}
                  </Text>
                  <Text style={styles.sellerTrustLabel}>Listings posted</Text>
                </View>
                <View style={styles.sellerTrustCard}>
                  <Text style={styles.sellerTrustValue}>
                    {listing.seller.respondedInquiryCount ?? 0}
                  </Text>
                  <Text style={styles.sellerTrustLabel}>Buyer replies sent</Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.sectionText}>
              Seller information is unavailable right now.
            </Text>
          )}
        </View>

        {hasRequestedContact ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seller contact</Text>
            <Text style={styles.sectionText}>
              {listing.seller?.phone
                ? `Phone: ${listing.seller.phone}`
                : 'This seller has not added a phone number yet.'}
            </Text>
          </View>
        ) : null}

        {user?.id !== listing.sellerId ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Report this listing</Text>
            <Text style={styles.sectionText}>
              If something looks inaccurate, suspicious, or misleading, you can flag it for
              review.
            </Text>
            <Pressable onPress={handleOpenReport} style={styles.reportButton}>
              <Text style={styles.reportButtonText}>
                {user ? 'Report listing' : 'Sign in to report'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {relatedListings.length > 0 ? (
          <View style={styles.relatedSection}>
            <View style={styles.relatedHeader}>
              <View>
                <Text style={styles.sectionTitle}>Related listings</Text>
                <Text style={styles.relatedSubtitle}>
                  Similar waste listings you can compare right away.
                </Text>
              </View>
            </View>
            <View style={styles.relatedStack}>
              {relatedListings.map((item) => (
                <ListingCard
                  key={item.id}
                  listing={item}
                  onPress={() => router.replace(`/(shared)/listing/${item.id}`)}
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {canContactSeller ? (
        <View style={styles.footer}>
          <Pressable onPress={handleContactPress} style={styles.footerButton}>
            <Text style={styles.footerButtonText}>
              {hasRequestedContact && listing.seller?.phone
                ? `Call ${listing.seller.phone}`
                : hasRequestedContact
                  ? 'Request sent'
                  : 'Contact Seller'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <ContactSellerModal
        isVisible={isContactModalVisible}
        message={contactMessage}
        isSubmitting={isSubmittingContact}
        onChangeMessage={setContactMessage}
        onClose={() => {
          if (!isSubmittingContact) {
            setIsContactModalVisible(false)
          }
        }}
        onSubmit={() => {
          void handleSubmitContactRequest()
        }}
      />
      <ListingReportModal
        isVisible={isReportModalVisible}
        selectedReason={reportReason}
        details={reportDetails}
        isSubmitting={isSubmittingReport}
        onSelectReason={setReportReason}
        onChangeDetails={setReportDetails}
        onClose={() => {
          if (!isSubmittingReport) {
            setIsReportModalVisible(false)
          }
        }}
        onSubmit={() => {
          void handleSubmitReport()
        }}
      />
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
  contentWithFooter: {
    paddingBottom: 120,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: palette.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonText: {
    color: palette.soil,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyWrapper: {
    flex: 1,
    padding: 20,
  },
  heroImage: {
    width: '100%',
    height: 240,
    borderRadius: radii.lg,
    backgroundColor: '#ded3c4',
  },
  heroPlaceholder: {
    height: 240,
    borderRadius: radii.lg,
    backgroundColor: '#d8ccb9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderLabel: {
    color: palette.soil,
    fontSize: 22,
    fontWeight: '800',
  },
  heroContent: {
    gap: 8,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  heroTextBlock: {
    flex: 1,
    gap: 8,
  },
  eyebrow: {
    color: palette.harvest,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontWeight: '700',
    fontSize: 11,
  },
  title: {
    color: palette.soil,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  price: {
    color: palette.sageDark,
    fontSize: 24,
    fontWeight: '800',
  },
  meta: {
    color: palette.muted,
    lineHeight: 22,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  infoBadge: {
    borderRadius: 999,
    backgroundColor: '#eef5ef',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  infoBadgeText: {
    color: palette.sageDark,
    fontSize: 12,
    fontWeight: '800',
  },
  shareButton: {
    alignSelf: 'flex-start',
    backgroundColor: palette.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  shareButtonText: {
    color: palette.sageDark,
    fontSize: 13,
    fontWeight: '800',
  },
  savedButton: {
    backgroundColor: '#e1eee4',
    borderColor: '#c8decf',
  },
  savedButtonText: {
    color: palette.sageDark,
  },
  section: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    gap: 12,
    ...shadow,
  },
  sellerSection: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 18,
    gap: 12,
  },
  relatedSection: {
    gap: 12,
  },
  relatedHeader: {
    gap: 4,
  },
  relatedSubtitle: {
    color: palette.muted,
    lineHeight: 20,
  },
  relatedStack: {
    gap: 12,
  },
  sectionTitle: {
    color: palette.soil,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionText: {
    color: palette.muted,
    lineHeight: 22,
  },
  locationDistance: {
    color: palette.sageDark,
    fontSize: 14,
    fontWeight: '800',
  },
  locationAction: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#eef5ef',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  locationActionText: {
    color: palette.sageDark,
    fontSize: 13,
    fontWeight: '800',
  },
  locationMap: {
    width: '100%',
    height: 180,
    borderRadius: radii.md,
    marginTop: 2,
  },
  mapHint: {
    color: palette.muted,
    fontSize: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  detailLabel: {
    color: palette.muted,
    fontWeight: '600',
  },
  detailValue: {
    flex: 1,
    color: palette.soil,
    textAlign: 'right',
    fontWeight: '600',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#d7d0c5',
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
    fontWeight: '800',
    fontSize: 16,
  },
  sellerMeta: {
    flex: 1,
    gap: 6,
  },
  sellerBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  sellerBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f3f5f2',
    borderWidth: 1,
    borderColor: palette.border,
  },
  sellerBadgePositive: {
    backgroundColor: '#eef6ed',
    borderColor: 'rgba(58, 102, 72, 0.12)',
  },
  sellerBadgeNeutral: {
    backgroundColor: '#f5f6f4',
  },
  sellerBadgeText: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  sellerBadgeTextPositive: {
    color: palette.sageDark,
  },
  sellerTrustSummaryCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#fafbfa',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  sellerTrustSummaryCardPositive: {
    backgroundColor: '#eef6ed',
    borderColor: 'rgba(58, 102, 72, 0.12)',
  },
  sellerTrustSummaryTitle: {
    color: palette.soil,
    fontSize: 14,
    fontWeight: '800',
  },
  sellerTrustSummaryText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  sellerVerificationHint: {
    color: palette.sageDark,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  sellerTrustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sellerTrustCard: {
    width: '31%',
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 4,
    ...shadow,
  },
  sellerTrustValue: {
    color: palette.soil,
    fontSize: 22,
    fontWeight: '900',
  },
  sellerTrustLabel: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  sellerName: {
    color: palette.soil,
    fontSize: 16,
    fontWeight: '800',
  },
  sellerLocation: {
    color: palette.muted,
  },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  footerButton: {
    minHeight: 56,
    borderRadius: radii.lg,
    backgroundColor: palette.sage,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    ...shadow,
  },
  footerButtonText: {
    color: palette.cream,
    fontSize: 16,
    fontWeight: '800',
  },
  reportButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#f9e4df',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  reportButtonText: {
    color: palette.error,
    fontSize: 13,
    fontWeight: '800',
  },
})
