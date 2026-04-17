import { zodResolver } from '@hookform/resolvers/zod'
import Constants from 'expo-constants'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import type { AIHealthResult, ListingAssistResult } from '../types/app'
import type { ListingFormValues } from '../utils/schemas'
import type { WasteTypeValue } from '../utils/wasteTypes'

import {
  assistListing,
  getAIHealth,
  submitAIFeedback,
} from '../services/aiService'
import { pickAndCompressImage, readImageAsBase64 } from '../utils/imageUtils'
import { listingSchema } from '../utils/schemas'
import { palette, radii } from '../utils/theme'
import { getWasteSuggestions, WASTE_TYPES } from '../utils/wasteTypes'
import { FormField } from './FormField'
import { LocationPicker } from './LocationPicker'
import { WasteSuggestions } from './WasteSuggestions'

const fulfillmentOptions = [
  { value: 'pickup', label: 'Pickup' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'both', label: 'Both' },
] as const

const unitPresets = ['kg', 'sack', 'bundle', 'ton']
const extra = Constants.expoConfig?.extra ?? {}
const aiListingAssistEnabled = extra.aiListingAssistEnabled === true

type ListingEditorProps = {
  heroTitle?: string
  heroSubtitle?: string
  submitLabel: string
  submittingLabel: string
  initialValues: ListingFormValues
  onSubmitValues: (values: ListingFormValues) => Promise<void>
  onInfo: (message: string) => void
  onError: (message: string) => void
}

type ListingDraftSnapshot = Pick<
  ListingFormValues,
  'title' | 'description' | 'waste_type' | 'unit'
>

export function ListingEditor({
  heroTitle,
  heroSubtitle,
  submitLabel,
  submittingLabel,
  initialValues,
  onSubmitValues,
  onInfo,
  onError,
}: ListingEditorProps) {
  const scrollViewRef = useRef<ScrollView>(null)
  const fieldPositions = useRef<Partial<Record<keyof ListingFormValues, number>>>({})
  const [aiHealth, setAiHealth] = useState<AIHealthResult | null>(null)
  const [aiHealthError, setAiHealthError] = useState<string | null>(null)
  const [isCheckingAIHealth, setIsCheckingAIHealth] =
    useState(aiListingAssistEnabled)
  const [isAiApplying, setIsAiApplying] = useState(false)
  const [isSubmittingAiFeedback, setIsSubmittingAiFeedback] = useState(false)
  const [aiAssistResult, setAiAssistResult] =
    useState<ListingAssistResult | null>(null)
  const [aiDraftSnapshot, setAiDraftSnapshot] =
    useState<ListingDraftSnapshot | null>(null)
  const [aiFeedbackStatus, setAiFeedbackStatus] = useState<
    'accepted' | 'rejected' | null
  >(null)
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: initialValues,
  })

  useEffect(() => {
    reset(initialValues)
  }, [initialValues, reset])

  const checkAiHealth = async () => {
    if (!aiListingAssistEnabled) {
      return false
    }

    setIsCheckingAIHealth(true)
    setAiHealthError(null)

    try {
      const result = await getAIHealth()

      if (result.error || !result.data) {
        setAiHealth(null)
        setAiHealthError(
          result.error?.message ?? 'AI is unavailable right now.',
        )
        return false
      }

      setAiHealth(result.data)

      if (!result.data.available) {
        const unavailableMessage =
          result.data.providers.find((provider) => provider.enabled)?.message ??
          'No AI providers are currently reachable.'

        setAiHealthError(unavailableMessage)
        return false
      }

      return true
    } finally {
      setIsCheckingAIHealth(false)
    }
  }

  useEffect(() => {
    if (!aiListingAssistEnabled) {
      return
    }

    void checkAiHealth()
  }, [])

  const selectedWasteType = watch('waste_type')
  const coordinates = {
    latitude: watch('latitude') as number | null,
    longitude: watch('longitude') as number | null,
  }
  const acceptsOffers = watch('accept_offers')
  const selectedFulfillmentType = watch('fulfillment_type')
  const selectedUnit = watch('unit')
  const wasteSuggestions = getWasteSuggestions(selectedWasteType)
  const selectedImage = watch('image_url')
  const primaryAiProviderLabel =
    aiHealth?.primaryProvider === 'local_gemma'
      ? 'Local Gemma'
      : aiHealth?.primaryProvider === 'gemini'
        ? 'Gemini'
        : null
  const hasGeminiFallback =
    aiHealth?.providers.some(
      (provider) => provider.provider === 'gemini' && provider.enabled,
    ) ?? false
  const fieldOrder = useMemo<(keyof ListingFormValues)[]>(
    () => [
      'title',
      'description',
      'price',
      'quantity',
      'unit',
      'city',
      'address',
      'fulfillment_type',
    ],
    [],
  )

  const registerFieldPosition =
    (fieldName: keyof ListingFormValues) =>
    (event: { nativeEvent: { layout: { y: number } } }) => {
      fieldPositions.current[fieldName] = event.nativeEvent.layout.y
    }

  const scrollToField = (fieldName: keyof ListingFormValues) => {
    const y = fieldPositions.current[fieldName]

    if (typeof y !== 'number') {
      return
    }

    scrollViewRef.current?.scrollTo({
      y: Math.max(y - 24, 0),
      animated: true,
    })
  }

  const onSubmit = handleSubmit(
    async (values) => {
      await onSubmitValues(values)
    },
    (fieldErrors) => {
      const firstErrorField = fieldOrder.find((fieldName) => fieldErrors[fieldName])

      if (firstErrorField) {
        scrollToField(firstErrorField)
        const message = fieldErrors[firstErrorField]?.message

        if (typeof message === 'string' && message.length > 0) {
          onError(message)
          return
        }
      }

      onError('Please complete the missing fields before publishing.')
    },
  )

  const handlePickImage = async () => {
    const imageUri = await pickAndCompressImage()

    if (!imageUri) {
      return
    }

    setValue('image_url', imageUri, { shouldValidate: true })
    onInfo('Image ready for upload.')
  }

  const recordAiFeedback = async (helpful: boolean) => {
    if (!aiAssistResult?.eventId) {
      return false
    }

    setIsSubmittingAiFeedback(true)

    try {
      const result = await submitAIFeedback({
        eventId: aiAssistResult.eventId,
        feature: 'listing_copilot',
        helpful,
      })

      if (result.error || !result.data) {
        onError(
          'Your choice was applied, but the AI feedback could not be recorded.',
        )
        return false
      }

      return true
    } finally {
      setIsSubmittingAiFeedback(false)
    }
  }

  const handleAcceptAiSuggestion = async () => {
    setAiFeedbackStatus('accepted')
    const recorded = await recordAiFeedback(true)
    onInfo(
      recorded
        ? 'AI suggestion kept. Feedback recorded.'
        : 'AI suggestion kept. You can still edit the fields before publishing.',
    )
  }

  const handleRejectAiSuggestion = async () => {
    if (aiDraftSnapshot) {
      setValue('title', aiDraftSnapshot.title, { shouldValidate: true })
      setValue('description', aiDraftSnapshot.description, {
        shouldValidate: true,
      })
      setValue('waste_type', aiDraftSnapshot.waste_type as WasteTypeValue, {
        shouldValidate: true,
      })
      setValue('unit', aiDraftSnapshot.unit, { shouldValidate: true })
    }

    setAiFeedbackStatus('rejected')
    const recorded = await recordAiFeedback(false)
    onInfo(
      recorded
        ? 'Previous draft restored. Feedback recorded.'
        : 'Previous draft restored. You can revise it manually or try AI again.',
    )
  }

  const handleAiAssist = async () => {
    if (isCheckingAIHealth) {
      return
    }

    if (!aiHealth?.available) {
      onError('AI is unavailable right now. You can continue manually.')
      return
    }

    const title = watch('title')?.trim() ?? ''
    const description = watch('description')?.trim() ?? ''

    if (!title || !description) {
      onError('Add at least a rough title and description before using AI assist.')
      return
    }

    setIsAiApplying(true)

    try {
      const currentDraftSnapshot: ListingDraftSnapshot = {
        title,
        description,
        waste_type: selectedWasteType,
        unit: watch('unit'),
      }
      let imageBase64: string | null = null
      let imageMimeType: string | null = null

      if (selectedImage && !selectedImage.startsWith('http')) {
        imageBase64 = await readImageAsBase64(selectedImage)
        imageMimeType = 'image/jpeg'
      }

      const result = await assistListing({
        title,
        description,
        wasteType: selectedWasteType ?? null,
        quantity: Number.isFinite(Number(watch('quantity')))
          ? Number(watch('quantity'))
          : null,
        unit: watch('unit')?.trim() || null,
        city: watch('city')?.trim() || null,
        fulfillmentType: watch('fulfillment_type') ?? null,
        price: Number.isFinite(Number(watch('price'))) ? Number(watch('price')) : null,
        imageBase64,
        imageMimeType,
      })

      if (result.error || !result.data) {
        onError(result.error?.message ?? 'AI assist is unavailable right now.')
        return
      }

      const nextValues = result.data.result

      setValue('title', nextValues.improvedTitle, { shouldValidate: true })
      setValue('description', nextValues.improvedDescription, {
        shouldValidate: true,
      })

      if (
        nextValues.suggestedWasteType &&
        WASTE_TYPES.some((item) => item.value === nextValues.suggestedWasteType)
      ) {
        setValue('waste_type', nextValues.suggestedWasteType as WasteTypeValue, {
          shouldValidate: true,
        })
      }

      if (nextValues.suggestedUnit) {
        setValue('unit', nextValues.suggestedUnit, { shouldValidate: true })
      }

      setAiDraftSnapshot(currentDraftSnapshot)
      setAiFeedbackStatus(null)
      setAiAssistResult(result.data)
      onInfo('AI suggestions applied. Review the fields before publishing.')
    } catch {
      onError('AI assist is unavailable right now. You can continue manually.')
    } finally {
      setIsAiApplying(false)
    }
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.content}>
        {heroTitle || heroSubtitle ? (
          <View style={styles.hero}>
            {heroTitle ? <Text style={styles.title}>{heroTitle}</Text> : null}
            {heroSubtitle ? (
              <Text style={styles.subtitle}>{heroSubtitle}</Text>
            ) : null}
          </View>
        ) : null}

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

          <View onLayout={registerFieldPosition('title')}>
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
          </View>
          <View onLayout={registerFieldPosition('description')}>
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
          </View>

          {aiListingAssistEnabled ? (
            <View style={styles.aiSection}>
              <Pressable
                disabled={isAiApplying || isCheckingAIHealth}
                onPress={aiHealth?.available ? handleAiAssist : checkAiHealth}
                style={[
                  styles.aiButton,
                  isAiApplying || isCheckingAIHealth
                    ? styles.aiButtonDisabled
                    : null,
                ]}
              >
                <Text style={styles.aiButtonText}>
                  {isCheckingAIHealth
                    ? 'Checking AI...'
                    : isAiApplying
                      ? 'Improving with AI...'
                      : aiHealth?.available
                        ? 'Improve with AI'
                        : 'Retry AI check'}
                </Text>
              </Pressable>
              {aiHealth?.available ? (
                <Text style={styles.aiMeta}>
                  Ready to refine your title and description with{' '}
                  {primaryAiProviderLabel ?? 'AI'}
                  {hasGeminiFallback ? ' and Gemini fallback if needed.' : '.'}
                </Text>
              ) : (
                <View style={styles.aiUnavailableCard}>
                  <Text style={styles.aiUnavailableTitle}>
                    AI is not ready right now
                  </Text>
                  <Text style={styles.aiUnavailableText}>
                    {aiHealthError ??
                      'We could not reach the configured providers. You can keep writing manually and retry later.'}
                  </Text>
                </View>
              )}
              {aiAssistResult ? (
                <View style={styles.aiResultCard}>
                  <View style={styles.aiResultHeader}>
                    <Text style={styles.aiResultTitle}>AI suggestions ready</Text>
                    <View
                      style={[
                        styles.aiReadinessBadge,
                        aiAssistResult.result.publishReadiness === 'ready'
                          ? styles.aiReadinessBadgeReady
                          : styles.aiReadinessBadgeReview,
                      ]}
                    >
                      <Text style={styles.aiReadinessText}>
                        {aiAssistResult.result.publishReadiness === 'ready'
                          ? 'Ready'
                          : 'Review'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.aiProviderMeta}>
                    Provider:{' '}
                    {aiAssistResult.provider === 'local_gemma'
                      ? 'Local Gemma'
                      : 'Gemini'}
                    {aiAssistResult.fallbackUsed ? ' | fallback used' : ''}
                  </Text>
                  {aiAssistResult.result.notes.length > 0 ? (
                    <View style={styles.aiListBlock}>
                      <Text style={styles.aiListLabel}>Notes</Text>
                      {aiAssistResult.result.notes.map((note) => (
                        <Text key={note} style={styles.aiListItem}>
                          - {note}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  {aiAssistResult.result.missingFields.length > 0 ? (
                    <View style={styles.aiListBlock}>
                      <Text style={styles.aiListLabel}>Still review</Text>
                      {aiAssistResult.result.missingFields.map((item) => (
                        <Text key={item} style={styles.aiListItem}>
                          - {item}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  {aiFeedbackStatus ? (
                    <Text style={styles.aiFeedbackNote}>
                      {aiFeedbackStatus === 'accepted'
                        ? 'Suggestion kept. You can continue editing before you publish.'
                        : 'Previous draft restored. You can keep editing or run AI again.'}
                    </Text>
                  ) : (
                    <View style={styles.aiFeedbackActions}>
                      <Pressable
                        disabled={isSubmittingAiFeedback}
                        onPress={handleAcceptAiSuggestion}
                        style={[
                          styles.aiFeedbackPrimaryButton,
                          isSubmittingAiFeedback
                            ? styles.aiFeedbackButtonDisabled
                            : null,
                        ]}
                      >
                        <Text style={styles.aiFeedbackPrimaryText}>
                          {isSubmittingAiFeedback
                            ? 'Saving...'
                            : 'Use suggestion'}
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={isSubmittingAiFeedback}
                        onPress={handleRejectAiSuggestion}
                        style={[
                          styles.aiFeedbackSecondaryButton,
                          isSubmittingAiFeedback
                            ? styles.aiFeedbackButtonDisabled
                            : null,
                        ]}
                      >
                        <Text style={styles.aiFeedbackSecondaryText}>
                          Not helpful
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ) : null}
            </View>
          ) : null}

          <View
            style={styles.row}
            onLayout={(event) => {
              registerFieldPosition('price')(event)
              registerFieldPosition('quantity')(event)
            }}
          >
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
          <View
            style={styles.row}
            onLayout={(event) => {
              registerFieldPosition('unit')(event)
              registerFieldPosition('city')(event)
            }}
          >
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
          <View style={styles.selectorBlock}>
            <Text style={styles.selectorLabel}>Common units</Text>
            <View style={styles.selectorWrap}>
              {unitPresets.map((unit) => {
                const selected = selectedUnit === unit

                return (
                  <Pressable
                    key={unit}
                    onPress={() =>
                      setValue('unit', unit, {
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
                      {unit}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
          <View onLayout={registerFieldPosition('address')}>
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
          </View>
          <View
            style={styles.selectorBlock}
            onLayout={registerFieldPosition('fulfillment_type')}
          >
            <Text style={styles.selectorLabel}>Fulfillment type</Text>
            <View style={styles.selectorWrap}>
              {fulfillmentOptions.map((option) => {
                const selected = selectedFulfillmentType === option.value

                return (
                  <Pressable
                    key={option.value}
                    onPress={() =>
                      setValue('fulfillment_type', option.value, {
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
                      {option.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            {errors.fulfillment_type?.message ? (
              <Text style={styles.errorText}>
                {errors.fulfillment_type.message}
              </Text>
            ) : null}
          </View>

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
                {selectedImage.startsWith('http')
                  ? 'This listing already has an uploaded image.'
                  : 'The compressed image will upload to Supabase Storage when you save this listing.'}
              </Text>
            </View>
          ) : null}

          <Pressable onPress={handlePickImage} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>
              {selectedImage ? 'Replace Image' : 'Pick and Compress Image'}
            </Text>
          </Pressable>

          <Pressable
            disabled={isSubmitting}
            onPress={onSubmit}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? submittingLabel : submitLabel}
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
    gap: 6,
  },
  title: {
    color: palette.soil,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.muted,
    lineHeight: 22,
  },
  form: {
    gap: 16,
  },
  aiSection: {
    gap: 10,
  },
  aiButton: {
    backgroundColor: palette.sageDark,
    borderRadius: radii.md,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiButtonDisabled: {
    opacity: 0.7,
  },
  aiButtonText: {
    color: palette.cream,
    fontSize: 15,
    fontWeight: '800',
  },
  aiMeta: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  aiUnavailableCard: {
    gap: 6,
    backgroundColor: '#fbf0ec',
    borderWidth: 1,
    borderColor: 'rgba(173, 72, 34, 0.18)',
    borderRadius: radii.md,
    padding: 14,
  },
  aiUnavailableTitle: {
    color: '#a14628',
    fontSize: 14,
    fontWeight: '800',
  },
  aiUnavailableText: {
    color: '#8f4e39',
    fontSize: 13,
    lineHeight: 19,
  },
  aiResultCard: {
    gap: 10,
    backgroundColor: palette.parchment,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    padding: 16,
  },
  aiResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  aiResultTitle: {
    color: palette.soil,
    fontSize: 16,
    fontWeight: '800',
  },
  aiReadinessBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  aiReadinessBadgeReady: {
    backgroundColor: 'rgba(58, 102, 72, 0.14)',
  },
  aiReadinessBadgeReview: {
    backgroundColor: 'rgba(176, 126, 40, 0.14)',
  },
  aiReadinessText: {
    color: palette.sageDark,
    fontSize: 12,
    fontWeight: '800',
  },
  aiProviderMeta: {
    color: palette.muted,
    fontSize: 13,
  },
  aiListBlock: {
    gap: 6,
  },
  aiListLabel: {
    color: palette.soil,
    fontSize: 13,
    fontWeight: '700',
  },
  aiListItem: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  aiFeedbackActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  aiFeedbackPrimaryButton: {
    flex: 1,
    backgroundColor: palette.sageDark,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiFeedbackSecondaryButton: {
    flex: 1,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: 'rgba(160, 69, 50, 0.18)',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiFeedbackButtonDisabled: {
    opacity: 0.7,
  },
  aiFeedbackPrimaryText: {
    color: palette.cream,
    fontSize: 13,
    fontWeight: '800',
  },
  aiFeedbackSecondaryText: {
    color: palette.error,
    fontSize: 13,
    fontWeight: '800',
  },
  aiFeedbackNote: {
    color: palette.sageDark,
    fontSize: 13,
    lineHeight: 19,
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
    backgroundColor: palette.parchment,
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

