import { router } from 'expo-router'
import { useMemo } from 'react'

import { ListingEditor } from '../../components/ListingEditor'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { createListing } from '../../services/listingService'
import { uploadListingImage } from '../../services/storageService'
import type { ListingFormValues } from '../../utils/schemas'

function isRemoteImage(value?: string | null) {
  return typeof value === 'string' && /^https?:\/\//.test(value)
}

export default function CreateListingScreen() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const initialValues = useMemo<ListingFormValues>(
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

  const handleSubmitValues = async (values: ListingFormValues) => {
    if (!user) {
      showToast('Sign in before creating a listing.', 'error')
      return
    }

    let imageUrl: string | null = values.image_url ?? null

    if (values.image_url && !isRemoteImage(values.image_url)) {
      const uploadResult = await uploadListingImage(values.image_url, user.id)

      if (uploadResult.error) {
        showToast(uploadResult.error.message, 'error')
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

    showToast('Listing created successfully.', 'success')
    router.replace('/(farmer)/my-listings')
  }

  return (
    <ListingEditor
      heroTitle="Create a new listing"
      heroSubtitle="This form now uses the same waste types and fields defined in the repo schema."
      submitLabel="Publish Listing"
      submittingLabel="Saving listing..."
      initialValues={initialValues}
      onSubmitValues={handleSubmitValues}
      onInfo={(message) => showToast(message, 'info')}
    />
  )
}
