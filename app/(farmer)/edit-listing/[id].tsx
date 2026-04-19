import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BrandedLoadingScreen } from '../../../components/BrandedLoadingScreen'
import { EmptyState } from '../../../components/EmptyState'
import { ListingEditor } from '../../../components/ListingEditor'
import { useToast } from '../../../components/Toast'
import { getListingById, updateListing } from '../../../services/listingService'
import { uploadListingImage } from '../../../services/storageService'
import type { ListingDetail } from '../../../types/app'
import type { ListingFormValues } from '../../../utils/schemas'
import { palette } from '../../../utils/theme'

function isRemoteImage(value?: string | null) {
  return typeof value === 'string' && /^https?:\/\//.test(value)
}

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { showToast } = useToast()
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  const initialValues = useMemo<ListingFormValues | null>(() => {
    if (!listing) {
      return null
    }

    return {
      title: listing.title,
      description: listing.description ?? '',
      waste_type: listing.wasteType as ListingFormValues['waste_type'],
      price: listing.price,
      quantity: listing.quantity,
      unit: listing.unit,
      city: listing.city,
      address: listing.address ?? '',
      latitude: listing.latitude,
      longitude: listing.longitude,
      fulfillment_type: listing.fulfillmentType,
      accept_offers: listing.acceptOffers,
      image_url: listing.imageUrl,
    }
  }, [listing])

  const handleSubmitValues = async (values: ListingFormValues) => {
    if (!listing) {
      showToast('Listing could not be loaded.', 'error')
      return
    }

    let imageUrl: string | null = values.image_url ?? null

    if (values.image_url && !isRemoteImage(values.image_url)) {
      const uploadResult = await uploadListingImage(values.image_url, listing.sellerId)

      if (uploadResult.error) {
        showToast({
          title: 'Image upload failed',
          message:
            uploadResult.error.message ??
            'Check the image size, format, or connection, then try again.',
          variant: 'error',
        })
        return
      }

      imageUrl = uploadResult.data
    }

    const result = await updateListing(listing.id, {
      title: values.title,
      description: values.description,
      waste_type: values.waste_type,
      price: Number(values.price),
      quantity: Number(values.quantity),
      unit: values.unit,
      accept_offers: values.accept_offers,
      address: values.address,
      city: values.city,
      latitude: values.latitude == null ? null : Number(values.latitude),
      longitude: values.longitude == null ? null : Number(values.longitude),
      fulfillment_type: values.fulfillment_type,
      image_url: imageUrl,
    })

    if (result.error) {
      showToast(result.error.message, 'error')
      return
    }

    showToast({
      title: 'Listing updated',
      message: 'Your changes are saved and buyers will now see the latest details.',
      variant: 'success',
    })
    router.replace('/(farmer)/my-listings')
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <BrandedLoadingScreen message="Loading listing..." />
      </SafeAreaView>
    )
  }

  if (!initialValues) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.wrapper}>
          <EmptyState
            title="Listing not found"
            description="This listing could not be opened for editing. It may have been removed, or your session no longer has access to it."
            actionLabel="Back to my listings"
            onAction={() => router.replace('/(farmer)/my-listings')}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <ListingEditor
      submitLabel="Save Changes"
      submittingLabel="Updating listing..."
      initialValues={initialValues}
      onSubmitValues={handleSubmitValues}
      onInfo={(message) => showToast(message, 'info')}
      onError={(message) => showToast(message, 'error')}
    />
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  wrapper: {
    flex: 1,
    padding: 24,
  },
})
