import { router, useLocalSearchParams } from 'expo-router'
import * as ExpoLinking from 'expo-linking'
import { useEffect, useMemo, useRef, useState } from 'react'
import MapView, { Marker } from 'react-native-maps'
import {
  Linking,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ContactSellerModal } from '../../../components/ContactSellerModal'
import { EmptyState } from '../../../components/EmptyState'
import { ErrorState } from '../../../components/ErrorState'
import { FulfillmentLabel } from '../../../components/FulfillmentLabel'
import { AppImage } from '../../../components/AppImage'
import { ListingCard } from '../../../components/ListingCard'
import { ListingReportModal } from '../../../components/ListingReportModal'
import { ListingStatusBadge } from '../../../components/ListingStatusBadge'
import { ListingDetailScreenSkeleton } from '../../../components/ScreenSkeleton'
import { VerifiedBadge } from '../../../components/VerifiedBadge'
import { useToast } from '../../../components/Toast'
import { useAuth } from '../../../hooks/useAuth'
import { useOfflineActionQueueStore } from '../../../hooks/useOfflineActionQueue'
import { useBuyerLocationStore } from '../../../hooks/useBuyerLocation'
import { useConnectivity } from '../../../hooks/useConnectivity'
import { useOfflineDataStore } from '../../../hooks/useOfflineData'
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
import type {
  ContactRequestSummary,
  ListingDetail,
  ListingPreview,
} from '../../../types/app'
import { formatDate, formatPrice, titleCase } from '../../../utils/formatters'
import { formatDistanceAway, getDistanceKm } from '../../../utils/location'
import {
  formatOfflineSnapshotUpdatedAt,
  shouldUseOfflineSnapshot,
  shouldUseOfflineSnapshotValue,
} from '../../../utils/offlineData'
import { palette, radii, shadow } from '../../../utils/theme'

const EMPTY_LISTING_DETAIL_SNAPSHOT = {
  items: null as ListingDetail | null,
  updatedAt: null as string | null,
}

const EMPTY_LISTING_PREVIEW_SNAPSHOT = {
  items: [] as ListingPreview[],
  updatedAt: null as string | null,
}

const EMPTY_REQUEST_SUMMARY_SNAPSHOT = {
  items: [] as ContactRequestSummary[],
  updatedAt: null as string | null,
}

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
  const { isOffline } = useConnectivity()
  const { showToast } = useToast()
  const addRecentlyViewed = useRecentlyViewedStore((state) => state.addListing)
  const buyerCoordinates = useBuyerLocationStore((state) => state.coordinates)
  const setBuyerCoordinates = useBuyerLocationStore((state) => state.setCoordinates)
  const cachedListingDetail = useOfflineDataStore((state) =>
    id ? state.listingDetailsById[id] ?? EMPTY_LISTING_DETAIL_SNAPSHOT : EMPTY_LISTING_DETAIL_SNAPSHOT,
  )
  const cachedRelatedListings = useOfflineDataStore((state) =>
    id
      ? state.relatedListingsByListingId[id] ?? EMPTY_LISTING_PREVIEW_SNAPSHOT
      : EMPTY_LISTING_PREVIEW_SNAPSHOT,
  )
  const cachedBuyerRequests = useOfflineDataStore((state) =>
    user?.id ? state.buyerRequestsByUser[user.id] ?? EMPTY_REQUEST_SUMMARY_SNAPSHOT : EMPTY_REQUEST_SUMMARY_SNAPSHOT,
  )
  const queuedContactRequest = useOfflineActionQueueStore((state) =>
    user?.id && id
      ? state.items.find(
          (item) =>
            item.kind === 'contact_request' &&
            item.userId === user.id &&
            item.payload.listingId === id,
        ) ?? null
      : null,
  )
  const enqueueContactRequest = useOfflineActionQueueStore((state) => state.enqueueContactRequest)
  const setCachedListingDetail = useOfflineDataStore((state) => state.setListingDetail)
  const setCachedRelatedListings = useOfflineDataStore((state) => state.setRelatedListings)
  const savedListingIds = useSavedListingsStore((state) => state.listingIds)
  const toggleSavedListing = useSavedListingsStore((state) => state.toggleListing)
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLocationLoading, setIsLocationLoading] = useState(false)
  const [isContactModalVisible, setIsContactModalVisible] = useState(false)
  const [contactMessage, setContactMessage] = useState('')
  const [isSubmittingContact, setIsSubmittingContact] = useState(false)
  const [contactRequestId, setContactRequestId] = useState<string | null>(null)
  const [relatedListings, setRelatedListings] = useState<ListingPreview[]>([])
  const [isReportModalVisible, setIsReportModalVisible] = useState(false)
  const [reportReason, setReportReason] = useState<
    'inaccurate_details' | 'suspicious_listing' | 'wrong_photo' | 'spam' | 'other'
  >('inaccurate_details')
  const [reportDetails, setReportDetails] = useState('')
  const [reportDetailsError, setReportDetailsError] = useState<string | null>(null)
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const reportDetailsRef = useRef<TextInput>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadListing = async () => {
    if (!id) {
      setListing(null)
      setLoadError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)
    const result = await getListingById(id)

    if (result.error || !result.data) {
      setListing(null)
      setLoadError(result.error?.message ?? 'Listing could not be loaded right now.')
      setIsLoading(false)
      return
    }

    setListing(result.data)
    setCachedListingDetail(id, result.data)
    setIsLoading(false)
  }

  useEffect(() => {
    let isMounted = true

    const loadCurrentListing = async () => {
      if (!id) {
        if (isMounted) {
          setListing(null)
          setLoadError(null)
          setIsLoading(false)
        }
        return
      }

      setIsLoading(true)
      setLoadError(null)
      const result = await getListingById(id)

      if (!isMounted) {
        return
      }

      if (result.error || !result.data) {
        setListing(null)
        setLoadError(result.error?.message ?? 'Listing could not be loaded right now.')
        setIsLoading(false)
        return
      }

      setListing(result.data)
      setCachedListingDetail(id, result.data)
      setIsLoading(false)
    }

    void loadCurrentListing()

    return () => {
      isMounted = false
    }
  }, [id, setCachedListingDetail])

  const isUsingCachedListing = shouldUseOfflineSnapshotValue({
    isOffline,
    hasLiveValue: Boolean(listing),
    hasSnapshotValue: Boolean(cachedListingDetail.items),
  })
  const effectiveListing = isUsingCachedListing ? cachedListingDetail.items : listing
  const isUsingCachedRelatedListings = shouldUseOfflineSnapshot({
    isOffline,
    liveItemCount: relatedListings.length,
    snapshotItemCount: cachedRelatedListings.items.length,
  })
  const effectiveRelatedListings = isUsingCachedRelatedListings
    ? cachedRelatedListings.items
    : relatedListings
  const cachedListingUpdatedAt = useMemo(
    () => formatOfflineSnapshotUpdatedAt(cachedListingDetail.updatedAt),
    [cachedListingDetail.updatedAt],
  )
  const cachedContactRequest = useMemo(
    () =>
      cachedBuyerRequests.items.find((request) => request.listingId === effectiveListing?.id) ??
      null,
    [cachedBuyerRequests.items, effectiveListing?.id],
  )

  useEffect(() => {
    let isMounted = true

    const loadContactState = async () => {
      if (!user || role !== 'buyer' || !effectiveListing) {
        if (isMounted) {
          setContactRequestId(null)
        }
        return
      }

      if (isOffline) {
        if (isMounted) {
          setContactRequestId(cachedContactRequest?.id ?? null)
        }
        return
      }

      const result = await getBuyerContactRequests(user.id)

      if (!isMounted) {
        return
      }

      if (result.error) {
        setContactRequestId(cachedContactRequest?.id ?? null)
        return
      }

      const matchingRequest =
        (result.data ?? []).find((request) => request.listingId === effectiveListing.id) ?? null

      setContactRequestId(matchingRequest?.id ?? cachedContactRequest?.id ?? null)
    }

    void loadContactState()

    return () => {
      isMounted = false
    }
  }, [cachedContactRequest?.id, effectiveListing, isOffline, queuedContactRequest?.id, role, user])

  useEffect(() => {
    if (role !== 'buyer' || !effectiveListing) {
      return
    }

    addRecentlyViewed(effectiveListing.id)
  }, [addRecentlyViewed, effectiveListing, role])

  useEffect(() => {
    if (!user || role !== 'buyer' || !listing || isUsingCachedListing) {
      return
    }

    void recordListingView({
      listingId: listing.id,
      buyerId: user.id,
    })
  }, [isUsingCachedListing, listing, role, user])

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
      setCachedRelatedListings(listing.id, result.data ?? [])
    }

    void loadRelatedListings()

    return () => {
      isMounted = false
    }
  }, [listing, setCachedRelatedListings])

  const readableWasteType = useMemo(() => {
    if (!effectiveListing) {
      return ''
    }

    return titleCase(effectiveListing.wasteType.replace(/_/g, ' '))
  }, [effectiveListing])
  const locationDistanceLabel = useMemo(() => {
    if (
      !buyerCoordinates ||
      !effectiveListing ||
      effectiveListing.latitude == null ||
      effectiveListing.longitude == null
    ) {
      return null
    }

    return formatDistanceAway(
      getDistanceKm(buyerCoordinates, {
        latitude: effectiveListing.latitude,
        longitude: effectiveListing.longitude,
      }),
      buyerCoordinates.accuracyMeters,
    )
  }, [buyerCoordinates, effectiveListing])

  const canContactSeller =
    role === 'buyer' && !!user && !!effectiveListing && user.id !== effectiveListing.sellerId
  const hasRequestedContact = !!contactRequestId
  const hasQueuedContactRequest = !!queuedContactRequest
  const canSaveListing = role !== 'farmer'
  const isSaved = effectiveListing ? savedListingIds.includes(effectiveListing.id) : false
  const postedLabel = effectiveListing ? formatRelativePostedDate(effectiveListing.createdAt) : ''
  const sellerTrustSummary = useMemo(() => {
    if (!effectiveListing?.seller) {
      return null
    }

    if (effectiveListing.seller.isVerified) {
      return {
        title: 'Verified seller',
        description:
          'This seller passed manual Refamora review and has a verified trust badge visible to buyers.',
      }
    }

    return effectiveListing.seller.isProfileComplete
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
  }, [effectiveListing?.seller])

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
    if (!effectiveListing) {
      return
    }

    const listingUrl = ExpoLinking.createURL(`/listing/${effectiveListing.id}`)

    try {
      await Share.share({
        message: `Check this Refamora listing: ${effectiveListing.title}\n${listingUrl}`,
        url: listingUrl,
        title: effectiveListing.title,
      })
    } catch {
      showToast('Unable to open the share sheet right now.', 'error')
    }
  }

  const handleToggleSavedListing = () => {
    if (!effectiveListing) {
      return
    }

    const nextSaved = toggleSavedListing(effectiveListing.id)
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
    if (!user || !effectiveListing) {
      showToast('Sign in before contacting a seller.', 'error')
      return
    }

    if (isOffline) {
      enqueueContactRequest({
        userId: user.id,
        payload: {
          listingId: effectiveListing.id,
          buyerId: user.id,
          sellerId: effectiveListing.sellerId,
          message: contactMessage.trim() || null,
        },
      })
      setContactMessage('')
      setIsContactModalVisible(false)
      showToast('Inquiry queued. It will send automatically when you reconnect.', 'info')
      return
    }

    setIsSubmittingContact(true)

    const result = await sendContactRequest({
      listing_id: effectiveListing.id,
      buyer_id: user.id,
      seller_id: effectiveListing.sellerId,
      message: contactMessage.trim() || null,
    })

    setIsSubmittingContact(false)

    if (result.error) {
      showToast(result.error.message, 'error')
      return
    }

    if (!result.data) {
      showToast('Inquiry was sent, but the conversation could not be opened yet.', 'info')
      return
    }

    setContactRequestId(result.data.id)
    setContactMessage('')
    setIsContactModalVisible(false)

    if (effectiveListing.seller?.phone) {
      showToast({
        title: 'Inquiry sent',
        message:
          'Your request reached the seller. You can now open the conversation thread and their phone number is visible below.',
        variant: 'success',
      })
      return
    }

    showToast({
      title: 'Inquiry sent',
      message:
        'Your request reached the seller. You can now continue in the conversation thread.',
      variant: 'info',
    })
  }

  const handleContactPress = async () => {
    if (contactRequestId) {
      router.push(`/(shared)/conversation/${contactRequestId}`)
      return
    }

    if (hasQueuedContactRequest) {
      showToast('This inquiry is queued and will send automatically when you reconnect.', 'info')
      return
    }

    if (isOffline) {
      setIsContactModalVisible(true)
      return
    }

    if (!effectiveListing?.seller?.phone || !hasRequestedContact) {
      setIsContactModalVisible(true)
      return
    }
  }

  const handleOpenReport = () => {
    if (!effectiveListing) {
      return
    }

    if (!user) {
      router.push({
        pathname: '/(auth)/login',
        params: { redirect: `/(shared)/listing/${effectiveListing.id}` },
      })
      return
    }

    if (user.id === effectiveListing.sellerId) {
      showToast('You cannot report your own listing.', 'info')
      return
    }

    setReportDetailsError(null)
    setIsReportModalVisible(true)
  }

  const handleSubmitReport = async () => {
    if (!user || !effectiveListing) {
      showToast('Sign in before reporting a listing.', 'error')
      return
    }

    if (isOffline) {
      showToast('Reconnect before submitting a listing report.', 'info')
      return
    }

    if (reportReason === 'other' && !reportDetails.trim()) {
      setReportDetailsError('Add a short note so Refamora knows what needs review.')
      reportDetailsRef.current?.focus()
      showToast('Add a short note for the report before submitting.', 'error')
      return
    }

    setIsSubmittingReport(true)

    const result = await submitListingReport({
      listing_id: effectiveListing.id,
      reporter_id: user.id,
      seller_id: effectiveListing.sellerId,
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
    setReportDetailsError(null)
    showToast('Report submitted. Refamora can review this listing now.', 'success')
  }

  if (isLoading && !isUsingCachedListing) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <ListingDetailScreenSkeleton />
      </SafeAreaView>
    )
  }

  if (loadError && !effectiveListing) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.emptyWrapper}>
          <ErrorState
            title="Listing could not be loaded"
            description="Refamora could not load this listing right now. Try again to refresh the page."
            onAction={() => {
              void loadListing()
            }}
          />
        </View>
      </SafeAreaView>
    )
  }

  if (!effectiveListing) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.emptyWrapper}>
          <EmptyState
            title="Listing not available"
            description="This listing could not be loaded. It may have been removed, sold, or shared with an outdated link."
            actionLabel={user ? (role === 'farmer' ? 'Back to dashboard' : 'Browse listings') : 'Sign in'}
            onAction={() => {
              if (!user) {
                router.replace('/(auth)/login')
                return
              }

              router.replace(role === 'farmer' ? '/(farmer)/dashboard' : '/(buyer)/feed')
            }}
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

        {isUsingCachedListing ? (
          <View style={styles.cachedNotice}>
            <Text style={styles.cachedNoticeTitle}>Showing cached listing</Text>
            <Text style={styles.cachedNoticeText}>
              {cachedListingUpdatedAt
                ? `Last updated ${cachedListingUpdatedAt}. Reconnect to refresh price, availability, and seller details.`
                : 'Reconnect to refresh price, availability, and seller details.'}
            </Text>
          </View>
        ) : null}

        {hasQueuedContactRequest ? (
          <View style={styles.queuedNotice}>
            <Text style={styles.queuedNoticeTitle}>Inquiry queued for sync</Text>
            <Text style={styles.queuedNoticeText}>
              Your seller request is saved on this device and will send automatically once the
              connection returns.
            </Text>
          </View>
        ) : null}

        {effectiveListing.imageUrl ? (
          <AppImage uri={effectiveListing.imageUrl} style={styles.heroImage} />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroPlaceholderLabel}>{readableWasteType}</Text>
          </View>
        )}

        <View style={styles.heroContent}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.eyebrow}>{readableWasteType}</Text>
              <Text style={styles.title}>{effectiveListing.title}</Text>
              <Text style={styles.price}>
                {formatPrice(effectiveListing.price, effectiveListing.unit)}
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
              <Text style={styles.infoBadgeText}>{titleCase(effectiveListing.status)}</Text>
            </View>
            {locationDistanceLabel ? (
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeText}>{locationDistanceLabel}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.meta}>
            {effectiveListing.city} | {effectiveListing.quantity} {effectiveListing.unit} | {formatDate(effectiveListing.createdAt)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this listing</Text>
          <Text style={styles.sectionText}>
            {effectiveListing.description ?? 'No description added yet.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fulfillment</Text>
            <FulfillmentLabel type={effectiveListing.fulfillmentType} />
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Offers</Text>
            <Text style={styles.detailValue}>
              {effectiveListing.acceptOffers ? 'Seller accepts offers' : 'Fixed price'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <ListingStatusBadge status={effectiveListing.status} />
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address</Text>
            <Text style={styles.detailValue}>
              {effectiveListing.address ?? 'Address not provided'}
            </Text>
          </View>
        </View>

        {effectiveListing.latitude != null && effectiveListing.longitude != null ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.sectionText}>
              {effectiveListing.address ?? `${effectiveListing.city} listing location`}
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
                  `https://www.google.com/maps/search/?api=1&query=${effectiveListing.latitude},${effectiveListing.longitude}`,
                )
              }
            >
              <MapView
                pointerEvents="none"
                style={styles.locationMap}
                initialRegion={{
                  latitude: effectiveListing.latitude,
                  longitude: effectiveListing.longitude,
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
                    latitude: effectiveListing.latitude,
                    longitude: effectiveListing.longitude,
                  }}
                />
              </MapView>
            </Pressable>
            <Text style={styles.mapHint}>Tap the map to open the exact location.</Text>
          </View>
        ) : null}

        <View style={styles.sellerSection}>
          <Text style={styles.sectionTitle}>Seller trust</Text>
          {effectiveListing.seller ? (
            <>
              <View style={styles.sellerRow}>
                {effectiveListing.seller.avatarUrl ? (
                  <AppImage uri={effectiveListing.seller.avatarUrl} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>
                      {getAvatarInitials(effectiveListing.seller.fullName)}
                    </Text>
                  </View>
                )}
                <View style={styles.sellerMeta}>
                  <Text style={styles.sellerName}>{effectiveListing.seller.fullName}</Text>
                  <Text style={styles.sellerLocation}>
                    {effectiveListing.seller.city ?? 'Location not provided'}
                  </Text>
                  {effectiveListing.seller.isVerified ? <VerifiedBadge /> : null}
                  <View style={styles.sellerBadgeRow}>
                    <View
                      style={[
                        styles.sellerBadge,
                        effectiveListing.seller.isProfileComplete
                          ? styles.sellerBadgePositive
                          : styles.sellerBadgeNeutral,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sellerBadgeText,
                          effectiveListing.seller.isVerified || effectiveListing.seller.isProfileComplete
                            ? styles.sellerBadgeTextPositive
                            : null,
                        ]}
                      >
                        {effectiveListing.seller.isVerified
                          ? 'Verification approved'
                          : effectiveListing.seller.isProfileComplete
                            ? 'Profile ready'
                            : 'Profile improving'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.sellerBadge,
                        effectiveListing.seller.phone
                          ? styles.sellerBadgePositive
                          : styles.sellerBadgeNeutral,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sellerBadgeText,
                          effectiveListing.seller.phone ? styles.sellerBadgeTextPositive : null,
                        ]}
                      >
                        {effectiveListing.seller.phone ? 'Phone on file' : 'No phone yet'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {sellerTrustSummary ? (
                <View
                  style={[
                    styles.sellerTrustSummaryCard,
                    effectiveListing.seller.isProfileComplete
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
                  {!effectiveListing.seller.isVerified ? (
                    <Text style={styles.sellerVerificationHint}>
                      This seller has not been verified yet, but you can still review their profile
                      details and message history.
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.sellerTrustGrid}>
                <View style={styles.sellerTrustCard}>
                  <Text style={styles.sellerTrustValue}>
                    {effectiveListing.seller.profileCompletionPercent}%
                  </Text>
                  <Text style={styles.sellerTrustLabel}>Profile complete</Text>
                </View>
                <View style={styles.sellerTrustCard}>
                  <Text style={styles.sellerTrustValue}>
                    {effectiveListing.seller.listingCount ?? 0}
                  </Text>
                  <Text style={styles.sellerTrustLabel}>Listings posted</Text>
                </View>
                <View style={styles.sellerTrustCard}>
                  <Text style={styles.sellerTrustValue}>
                    {effectiveListing.seller.respondedInquiryCount ?? 0}
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
              {effectiveListing.seller?.phone
                ? `Phone: ${effectiveListing.seller.phone}`
                : 'This seller has not added a phone number yet.'}
            </Text>
          </View>
        ) : null}

        {user?.id !== effectiveListing.sellerId ? (
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

        {effectiveRelatedListings.length > 0 ? (
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
              {effectiveRelatedListings.map((item) => (
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
              {hasRequestedContact
                ? 'Open conversation'
                : hasQueuedContactRequest
                  ? 'Inquiry queued'
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
        detailsError={reportDetailsError}
        isSubmitting={isSubmittingReport}
        detailsInputRef={reportDetailsRef}
        onSelectReason={(value) => {
          setReportReason(value)
          if (value !== 'other') {
            setReportDetailsError(null)
          }
        }}
        onChangeDetails={(value) => {
          setReportDetails(value)
          if (reportDetailsError && value.trim()) {
            setReportDetailsError(null)
          }
        }}
        onClose={() => {
          if (!isSubmittingReport) {
            setIsReportModalVisible(false)
            setReportDetailsError(null)
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
  cachedNotice: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(176, 126, 40, 0.18)',
    backgroundColor: '#fff7ea',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  cachedNoticeTitle: {
    color: palette.soil,
    fontSize: 13,
    fontWeight: '800',
  },
  cachedNoticeText: {
    color: palette.clay,
    fontSize: 12,
    lineHeight: 18,
  },
  queuedNotice: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
    backgroundColor: '#eef6ed',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  queuedNoticeTitle: {
    color: palette.soil,
    fontSize: 13,
    fontWeight: '800',
  },
  queuedNoticeText: {
    color: palette.sageDark,
    fontSize: 12,
    lineHeight: 18,
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
