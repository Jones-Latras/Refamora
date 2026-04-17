import { router, useLocalSearchParams } from 'expo-router'
import * as ExpoLinking from 'expo-linking'
import { useEffect, useMemo, useState } from 'react'
import MapView, { Marker } from 'react-native-maps'
import {
  ActivityIndicator,
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
import { useToast } from '../../../components/Toast'
import { useAuth } from '../../../hooks/useAuth'
import { useRecentlyViewedStore } from '../../../hooks/useRecentlyViewed'
import {
  getBuyerContactRequests,
  sendContactRequest,
} from '../../../services/contactService'
import { getListingById, getRelatedListings } from '../../../services/listingService'
import type { ListingDetail, ListingPreview } from '../../../types/app'
import { formatDate, formatPrice, titleCase } from '../../../utils/formatters'
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
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isContactModalVisible, setIsContactModalVisible] = useState(false)
  const [contactMessage, setContactMessage] = useState('')
  const [isSubmittingContact, setIsSubmittingContact] = useState(false)
  const [hasRequestedContact, setHasRequestedContact] = useState(false)
  const [relatedListings, setRelatedListings] = useState<ListingPreview[]>([])

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

  const canContactSeller =
    role === 'buyer' && !!user && !!listing && user.id !== listing.sellerId
  const postedLabel = listing ? formatRelativePostedDate(listing.createdAt) : ''

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
      showToast('Request sent. Seller phone is now visible below.', 'success')
      return
    }

    showToast('Request sent. The seller has not added a phone number yet.', 'info')
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

  if (isLoading) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={palette.sage} size="small" />
          <Text style={styles.loadingText}>Loading listing details...</Text>
        </View>
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
            <Pressable onPress={() => void handleShareListing()} style={styles.shareButton}>
              <Text style={styles.shareButtonText}>Share</Text>
            </Pressable>
          </View>
          <View style={styles.heroBadgeRow}>
            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeText}>{postedLabel}</Text>
            </View>
            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeText}>{titleCase(listing.status)}</Text>
            </View>
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
            <Text style={styles.detailValue}>{titleCase(listing.status)}</Text>
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
          <Text style={styles.sectionTitle}>Seller</Text>
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
                </View>
              </View>

              <View style={styles.sellerTrustGrid}>
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
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: palette.sageDark,
    fontWeight: '600',
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
    gap: 2,
  },
  sellerTrustGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  sellerTrustCard: {
    flex: 1,
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
})
