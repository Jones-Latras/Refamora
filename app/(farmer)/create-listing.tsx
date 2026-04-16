import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { FormField } from '../../components/FormField'
import { LocationPicker } from '../../components/LocationPicker'
import { useToast } from '../../components/Toast'
import { WasteSuggestions } from '../../components/WasteSuggestions'
import { useAuth } from '../../hooks/useAuth'
import { createListing } from '../../services/listingService'
import { uploadListingImage } from '../../services/storageService'
import { pickAndCompressImage } from '../../utils/imageUtils'
import type { ListingFormValues } from '../../utils/schemas'
import { listingSchema } from '../../utils/schemas'
import { palette, radii } from '../../utils/theme'
import {
  getWasteSuggestions,
  WASTE_TYPES,
  type WasteTypeValue,
} from '../../utils/wasteTypes'

export default function CreateListingScreen() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
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
    },
  })

  const selectedWasteType = watch('waste_type')
  const coordinates = {
    latitude: watch('latitude') as number | null,
    longitude: watch('longitude') as number | null,
  }
  const acceptsOffers = watch('accept_offers')
  const wasteSuggestions = getWasteSuggestions(selectedWasteType)
  const selectedImage = watch('image_url')

  const onSubmit = handleSubmit(async (values) => {
    if (!user) {
      showToast('Sign in before creating a listing.', 'error')
      return
    }

    let imageUrl: string | null = values.image_url ?? null

    if (values.image_url) {
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
  })

  const handlePickImage = async () => {
    const imageUri = await pickAndCompressImage()

    if (!imageUri) {
      return
    }

    setValue('image_url', imageUri)
    showToast('Image ready for upload.', 'info')
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>Create a new listing</Text>
          <Text style={styles.subtitle}>
            This form now uses the same waste types and fields defined in the
            repo schema.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.selectorBlock}>
            <Text style={styles.selectorLabel}>Waste type</Text>
            <View style={styles.selectorWrap}>
              {WASTE_TYPES.map((type) => {
                const selected = selectedWasteType === type.value

                return (
                  <Pressable
                    key={type.value}
                    onPress={() =>
                      setValue('waste_type', type.value as WasteTypeValue, {
                        shouldValidate: true,
                      })
                    }
                    style={[
                      styles.selectorChip,
                      selected ? styles.selectorChipActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectorChipText,
                        selected ? styles.selectorChipTextActive : null,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            {errors.waste_type?.message ? (
              <Text style={styles.errorText}>{errors.waste_type.message}</Text>
            ) : null}
          </View>

          {wasteSuggestions.length > 0 ? (
            <WasteSuggestions
              suggestions={wasteSuggestions}
              onSelect={(value) => setValue('title', value)}
            />
          ) : null}

          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <FormField
                label="Listing title"
                value={value}
                onChangeText={onChange}
                placeholder="Dry rice straw for mushroom growing"
                error={errors.title?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <FormField
                label="Description"
                value={value}
                onChangeText={onChange}
                placeholder="Short details about moisture, condition, and volume"
                multiline
                error={errors.description?.message}
              />
            )}
          />
          <View style={styles.row}>
            <Controller
              control={control}
              name="price"
              render={({ field: { onChange, value } }) => (
                <View style={styles.flex}>
                  <FormField
                    label="Price"
                    value={String(value)}
                    onChangeText={onChange}
                    keyboardType="number-pad"
                    error={errors.price?.message}
                  />
                </View>
              )}
            />
            <Controller
              control={control}
              name="quantity"
              render={({ field: { onChange, value } }) => (
                <View style={styles.flex}>
                  <FormField
                    label="Quantity"
                    value={String(value)}
                    onChangeText={onChange}
                    keyboardType="number-pad"
                    error={errors.quantity?.message}
                  />
                </View>
              )}
            />
          </View>
          <View style={styles.row}>
            <Controller
              control={control}
              name="unit"
              render={({ field: { onChange, value } }) => (
                <View style={styles.flex}>
                  <FormField
                    label="Unit"
                    value={value}
                    onChangeText={onChange}
                    placeholder="kg"
                    error={errors.unit?.message}
                  />
                </View>
              )}
            />
            <Controller
              control={control}
              name="city"
              render={({ field: { onChange, value } }) => (
                <View style={styles.flex}>
                  <FormField
                    label="City"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Malaybalay"
                    error={errors.city?.message}
                  />
                </View>
              )}
            />
          </View>
          <Controller
            control={control}
            name="address"
            render={({ field: { onChange, value } }) => (
              <FormField
                label="Pickup address"
                value={value}
                onChangeText={onChange}
                placeholder="Purok 3, Malaybalay, Bukidnon"
                error={errors.address?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="fulfillment_type"
            render={({ field: { onChange, value } }) => (
              <FormField
                label="Fulfillment type"
                value={value}
                onChangeText={onChange}
                placeholder="pickup"
                error={errors.fulfillment_type?.message}
              />
            )}
          />

          <Pressable
            onPress={() =>
              setValue('accept_offers', !acceptsOffers, {
                shouldValidate: true,
              })
            }
            style={[
              styles.toggleCard,
              acceptsOffers ? styles.toggleCardActive : null,
            ]}
          >
            <View style={styles.toggleTextBlock}>
              <Text style={styles.toggleTitle}>Accept offers</Text>
              <Text style={styles.toggleMeta}>
                Let buyers negotiate instead of seeing a fixed price only.
              </Text>
            </View>
            <View
              style={[
                styles.toggleBadge,
                acceptsOffers ? styles.toggleBadgeActive : null,
              ]}
            >
              <Text
                style={[
                  styles.toggleBadgeText,
                  acceptsOffers ? styles.toggleBadgeTextActive : null,
                ]}
              >
                {acceptsOffers ? 'On' : 'Off'}
              </Text>
            </View>
          </Pressable>

          <LocationPicker
            value={coordinates}
            onChange={(value) => {
              setValue('latitude', value.latitude, { shouldValidate: true })
              setValue('longitude', value.longitude, { shouldValidate: true })
            }}
            onResolvedAddress={(value) => {
              if (value.address) {
                setValue('address', value.address, { shouldValidate: true })
              }

              if (value.city) {
                setValue('city', value.city, { shouldValidate: true })
              }
            }}
          />

          {selectedImage ? (
            <View style={styles.imageNotice}>
              <Text style={styles.imageNoticeTitle}>Image ready</Text>
              <Text style={styles.imageNoticeText}>
                The compressed image will upload to Supabase Storage when you
                publish this listing.
              </Text>
            </View>
          ) : null}

          <Pressable onPress={handlePickImage} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Pick and Compress Image</Text>
          </Pressable>

          <Pressable
            disabled={isSubmitting}
            onPress={onSubmit}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'Saving listing...' : 'Publish Listing'}
            </Text>
          </Pressable>
        </View>
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
    padding: 24,
    gap: 20,
  },
  hero: {
    backgroundColor: '#efe1c3',
    borderRadius: radii.lg,
    padding: 22,
    gap: 8,
  },
  title: {
    color: palette.soil,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.clay,
    lineHeight: 22,
  },
  form: {
    gap: 16,
  },
  selectorBlock: {
    gap: 10,
  },
  selectorLabel: {
    color: palette.soil,
    fontWeight: '700',
    fontSize: 14,
  },
  selectorWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectorChip: {
    backgroundColor: palette.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selectorChipActive: {
    backgroundColor: palette.sage,
    borderColor: palette.sage,
  },
  selectorChipText: {
    color: palette.clay,
    fontWeight: '700',
    fontSize: 13,
  },
  selectorChipTextActive: {
    color: palette.cream,
  },
  errorText: {
    color: palette.error,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: palette.sage,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: palette.cream,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: palette.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: palette.soil,
    fontWeight: '700',
  },
  imageNotice: {
    backgroundColor: '#eef5ef',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.2)',
    padding: 16,
    gap: 4,
  },
  imageNoticeTitle: {
    color: palette.sageDark,
    fontWeight: '800',
  },
  imageNoticeText: {
    color: palette.sageDark,
    lineHeight: 20,
  },
  toggleCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  toggleCardActive: {
    borderColor: palette.sage,
    backgroundColor: '#eef5ef',
  },
  toggleTextBlock: {
    flex: 1,
  },
  toggleTitle: {
    color: palette.soil,
    fontWeight: '800',
    fontSize: 15,
  },
  toggleMeta: {
    color: palette.muted,
    lineHeight: 20,
    marginTop: 4,
  },
  toggleBadge: {
    borderRadius: 999,
    backgroundColor: '#efe1c3',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  toggleBadgeActive: {
    backgroundColor: palette.sage,
  },
  toggleBadgeText: {
    color: palette.clay,
    fontWeight: '800',
    fontSize: 12,
  },
  toggleBadgeTextActive: {
    color: palette.cream,
  },
})
