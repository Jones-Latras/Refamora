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
import { pickAndCompressImage } from '../../utils/imageUtils'
import type { ListingFormValues } from '../../utils/schemas'
import { listingSchema } from '../../utils/schemas'
import { palette, radii } from '../../utils/theme'
import { WASTE_SUGGESTIONS } from '../../utils/wasteTypes'

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
      waste_type: 'Rice husk',
      price: 0,
      quantity: 1,
      unit: 'kg',
      city: '',
      latitude: null,
      longitude: null,
      fulfillment_type: 'pickup',
      image_url: null,
    },
  })

  const coordinates = {
    latitude: watch('latitude') as number | null,
    longitude: watch('longitude') as number | null,
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!user) {
      showToast('Sign in before creating a listing.', 'error')
      return
    }

    const result = await createListing({
      seller_id: user.id,
      title: values.title,
      description: values.description,
      waste_type: values.waste_type,
      price: Number(values.price),
      quantity: Number(values.quantity),
      unit: values.unit,
      city: values.city,
      latitude: values.latitude == null ? null : Number(values.latitude),
      longitude: values.longitude == null ? null : Number(values.longitude),
      fulfillment_type: values.fulfillment_type,
      image_url: values.image_url,
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
            This form follows the plan’s rules: Zod validation, image handling,
            and a dedicated location input.
          </Text>
        </View>

        <WasteSuggestions
          suggestions={WASTE_SUGGESTIONS}
          onSelect={(value) => setValue('title', value)}
        />

        <View style={styles.form}>
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <FormField
                label="Listing title"
                value={value}
                onChangeText={onChange}
                placeholder="Dry rice husk for composting"
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
          <Controller
            control={control}
            name="waste_type"
            render={({ field: { onChange, value } }) => (
              <FormField
                label="Waste type"
                value={value}
                onChangeText={onChange}
                placeholder="Rice husk"
                error={errors.waste_type?.message}
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

          <LocationPicker
            value={coordinates}
            onChange={(value) => {
              setValue('latitude', value.latitude)
              setValue('longitude', value.longitude)
            }}
          />

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
})
