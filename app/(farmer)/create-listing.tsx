import { useLocalSearchParams, router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '../../components/EmptyState'
import { ListingEditor } from '../../components/ListingEditor'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { useListingDraftStore } from '../../hooks/useListingDrafts'
import {
  createListing,
  getListingById,
} from '../../services/listingService'
import { uploadListingImage } from '../../services/storageService'
import type { ListingDetail } from '../../types/app'
import type { ListingFormValues } from '../../utils/schemas'
import { palette } from '../../utils/theme'

function isRemoteImage(value?: string | null) {
  return typeof value === 'string' && /^https?:\/\//.test(value)
}

export default function CreateListingScreen() {
  const { duplicateFromId } = useLocalSearchParams<{ duplicateFromId?: string }>()
  const { user } = useAuth()
  const { showToast } = useToast()
  const savedDraft = useListingDraftStore((state) =>
    user?.id ? state.draftsByUser[user.id] ?? null : null,
  )
  const saveDraft = useListingDraftStore((state) => state.saveDraft)
  const clearDraft = useListingDraftStore((state) => state.clearDraft)
  const [sourceListing, setSourceListing] = useState<ListingDetail | null>(null)
  const [isLoadingDuplicate, setIsLoadingDuplicate] = useState(Boolean(duplicateFromId))
  const [forcedInitialValues, setForcedInitialValues] =
    useState<ListingFormValues | null>(null)
  const [formResetSignal, setFormResetSignal] = useState(0)

  const blankInitialValues = useMemo<ListingFormValues>(
    () => ({
      title: '',
      description: '',
      waste_type: 'rice_straw',
      price: 0,
      quantity: 1,
      unit: 'kg',
      city: '',
      address: '',
      latitude: null,
      longitude: null,
      fulfillment_type: 'pickup',
      accept_offers: false,
      image_url: null,
    }),
    [],
  )

  useEffect(() => {
    let isMounted = true

    const loadDuplicateSource = async () => {
      if (!duplicateFromId) {
        if (isMounted) {
          setSourceListing(null)
          setIsLoadingDuplicate(false)
        }
        return
      }

      setIsLoadingDuplicate(true)
      const result = await getListingById(duplicateFromId)

      if (!isMounted) {
        return
      }

      if (result.error) {
        showToast(result.error.message, 'error')
      }

      setSourceListing(result.data)
      setIsLoadingDuplicate(false)
    }

    void loadDuplicateSource()

    return () => {
      isMounted = false
    }
  }, [duplicateFromId, showToast])

  useEffect(() => {
    if (duplicateFromId || sourceListing || savedDraft?.values) {
      setForcedInitialValues(null)
    }
  }, [duplicateFromId, savedDraft?.values, sourceListing])

  const initialValues = useMemo<ListingFormValues>(
    () =>
      forcedInitialValues
        ? forcedInitialValues
        : sourceListing
        ? {
            title: `${sourceListing.title} Copy`,
            description: sourceListing.description ?? '',
            waste_type: sourceListing.wasteType as ListingFormValues['waste_type'],
            price: sourceListing.price,
            quantity: sourceListing.quantity,
            unit: sourceListing.unit,
            city: sourceListing.city,
            address: sourceListing.address ?? '',
            latitude: sourceListing.latitude,
            longitude: sourceListing.longitude,
            fulfillment_type: sourceListing.fulfillmentType,
            accept_offers: sourceListing.acceptOffers,
            image_url: sourceListing.imageUrl,
          }
        : savedDraft?.values
          ? savedDraft.values
        : blankInitialValues,
    [blankInitialValues, forcedInitialValues, savedDraft?.values, sourceListing],
  )

  const handleSubmitValues = async (values: ListingFormValues) => {
    if (!user) {
      showToast('Sign in before creating a listing.', 'error')
      return
    }

    let imageUrl: string | null = values.image_url ?? null

    if (values.image_url && !isRemoteImage(values.image_url)) {
      const uploadResult = await uploadListingImage(values.image_url, user.id)

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

    const result = await createListing({
      seller_id: user.id,
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
      status: 'active',
    })

    if (result.error) {
      showToast(result.error.message, 'error')
      return
    }

    clearDraft(user.id)
    setSourceListing(null)
    setForcedInitialValues(blankInitialValues)
    setFormResetSignal((current) => current + 1)
    showToast({
      title: 'Listing published',
      message: 'Your listing is now live. You can create another one from this screen.',
      variant: 'success',
    })
    router.replace('/(farmer)/create-listing')
  }

  const handleSaveDraftValues = async (values: ListingFormValues) => {
    if (!user) {
      showToast('Sign in before saving a draft.', 'error')
      return
    }

    saveDraft(user.id, values)
    showToast({
      title: 'Draft saved',
      message: 'You can come back anytime and finish this listing from My Listings.',
      variant: 'success',
    })
  }

  if (isLoadingDuplicate) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator color={palette.sage} size="small" />
          <Text style={styles.helper}>Preparing duplicate listing...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (duplicateFromId && !sourceListing) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.wrapper}>
          <EmptyState
            title="Listing not found"
            description="The source listing for this duplicate flow could not be loaded. It may have been deleted, unpublished, or is no longer available in your account."
            actionLabel="Start a blank listing"
            onAction={() => router.replace('/(farmer)/create-listing')}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <ListingEditor
      heroTitle={
        sourceListing
          ? 'Duplicate listing'
          : savedDraft?.values
            ? 'Resume draft'
            : undefined
      }
      heroSubtitle={
        sourceListing
          ? 'Start from an existing listing, then adjust the details before publishing.'
          : savedDraft?.values
            ? 'Your unfinished listing draft has been restored. Continue where you left off.'
          : undefined
      }
      submitLabel="Publish Listing"
      submittingLabel="Saving listing..."
      draftLabel="Save Draft"
      draftSavedLabel="Saving draft..."
      initialValues={initialValues}
      formResetSignal={formResetSignal}
      onSubmitValues={handleSubmitValues}
      onSaveDraftValues={handleSaveDraftValues}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  helper: {
    color: palette.muted,
  },
  wrapper: {
    flex: 1,
    padding: 24,
  },
})
