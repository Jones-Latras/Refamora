import { zodResolver } from '@hookform/resolvers/zod'
import Constants from 'expo-constants'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import type {
  AIHealthResult,
  ListingAssistResult,
  ListingModerationResult,
  PhotoCheckResult,
  WasteValueAdviceResult,
} from '../types/app'
import type { ListingFormValues } from '../utils/schemas'
import type { WasteTypeValue } from '../utils/wasteTypes'

import {
  assistListing,
  getAIHealth,
  moderateListing,
  getPhotoCheck,
  getWasteValueAdvice,
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
  draftLabel?: string
  draftSavedLabel?: string
  initialValues: ListingFormValues
  onSubmitValues: (values: ListingFormValues) => Promise<void>
  onSaveDraftValues?: (values: ListingFormValues) => Promise<void>
  onInfo: (message: string) => void
  onError: (message: string) => void
}

type ListingDraftSnapshot = Pick<
  ListingFormValues,
  'title' | 'description' | 'waste_type' | 'unit'
>

type PublishQualityStatus = 'pass' | 'warn' | 'fail'

type PublishQualityItem = {
  id: string
  label: string
  description: string
  status: PublishQualityStatus
}

type ListingSectionKey = 'basics' | 'pricing' | 'map' | 'photos' | 'checks' | 'ai'

type CollapsibleSectionProps = {
  title: string
  hint: string
  summary?: string | null
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}

function hasText(value?: string | null) {
  return Boolean(value?.trim())
}

function CollapsibleSection({
  title,
  hint,
  summary,
  isOpen,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <View style={styles.sectionCard}>
      <Pressable onPress={onToggle} style={styles.sectionToggle}>
        <View style={styles.sectionToggleText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionHint}>{isOpen ? hint : summary ?? hint}</Text>
        </View>
        <View style={styles.sectionToggleBadge}>
          <Text style={styles.sectionToggleBadgeText}>{isOpen ? 'Hide' : 'Show'}</Text>
        </View>
      </Pressable>

      {isOpen ? children : null}
    </View>
  )
}

export function ListingEditor({
  heroTitle,
  heroSubtitle,
  submitLabel,
  submittingLabel,
  draftLabel = 'Save Draft',
  draftSavedLabel = 'Saving draft...',
  initialValues,
  onSubmitValues,
  onSaveDraftValues,
  onInfo,
  onError,
}: ListingEditorProps) {
  const scrollViewRef = useRef<ScrollView>(null)
  const fieldPositions = useRef<Partial<Record<keyof ListingFormValues, number>>>({})
  const qualityPanelPosition = useRef(0)
  const titleRef = useRef<TextInput>(null)
  const descriptionRef = useRef<TextInput>(null)
  const priceRef = useRef<TextInput>(null)
  const quantityRef = useRef<TextInput>(null)
  const unitRef = useRef<TextInput>(null)
  const cityRef = useRef<TextInput>(null)
  const addressRef = useRef<TextInput>(null)
  const [aiHealth, setAiHealth] = useState<AIHealthResult | null>(null)
  const [aiHealthError, setAiHealthError] = useState<string | null>(null)
  const [isCheckingAIHealth, setIsCheckingAIHealth] =
    useState(aiListingAssistEnabled)
  const [isAiApplying, setIsAiApplying] = useState(false)
  const [isWasteAdviceLoading, setIsWasteAdviceLoading] = useState(false)
  const [isPhotoCheckLoading, setIsPhotoCheckLoading] = useState(false)
  const [isModerationLoading, setIsModerationLoading] = useState(false)
  const [isSubmittingAiFeedback, setIsSubmittingAiFeedback] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [aiAssistResult, setAiAssistResult] =
    useState<ListingAssistResult | null>(null)
  const [wasteAdviceResult, setWasteAdviceResult] =
    useState<WasteValueAdviceResult | null>(null)
  const [moderationResult, setModerationResult] =
    useState<ListingModerationResult | null>(null)
  const [photoCheckResult, setPhotoCheckResult] =
    useState<PhotoCheckResult | null>(null)
  const [aiDraftSnapshot, setAiDraftSnapshot] =
    useState<ListingDraftSnapshot | null>(null)
  const [aiFeedbackStatus, setAiFeedbackStatus] = useState<
    'accepted' | 'rejected' | null
  >(null)
  const [openSections, setOpenSections] = useState<Record<ListingSectionKey, boolean>>({
    basics: true,
    pricing: true,
    map: false,
    photos: false,
    checks: false,
    ai: false,
  })
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
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

  useEffect(() => {
    setWasteAdviceResult(null)
  }, [selectedWasteType])

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
  const titleValue = watch('title')
  const descriptionValue = watch('description')
  const cityValue = watch('city')
  const addressValue = watch('address')
  const priceValue = watch('price')
  const quantityValue = watch('quantity')
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
  const selectedWasteTypeLabel =
    WASTE_TYPES.find((item) => item.value === selectedWasteType)?.label ?? null
  const canRunPhotoCheck =
    Boolean(selectedImage) && !selectedImage?.startsWith('http')
  const fieldOrder = useMemo<(keyof ListingFormValues)[]>(
    () => [
      'waste_type',
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

  useEffect(() => {
    setPhotoCheckResult(null)
  }, [selectedImage])

  useEffect(() => {
    setModerationResult(null)
  }, [
    titleValue,
    descriptionValue,
    selectedWasteType,
    selectedImage,
    cityValue,
    priceValue,
    selectedUnit,
  ])

  const registerFieldPosition =
    (fieldName: keyof ListingFormValues) =>
    (event: { nativeEvent: { layout: { y: number } } }) => {
      fieldPositions.current[fieldName] = event.nativeEvent.layout.y
    }

  const scrollToField = (fieldName: keyof ListingFormValues) => {
    const y = fieldPositions.current[fieldName]

    if (typeof y === 'number') {
      scrollViewRef.current?.scrollTo({
        y: Math.max(y - 24, 0),
        animated: true,
      })
    }

    const fieldRefs: Partial<Record<keyof ListingFormValues, RefObject<TextInput | null>>> = {
      title: titleRef,
      description: descriptionRef,
      price: priceRef,
      quantity: quantityRef,
      unit: unitRef,
      city: cityRef,
      address: addressRef,
    }

    fieldRefs[fieldName]?.current?.focus()
  }

  const scrollToQualityPanel = () => {
    scrollViewRef.current?.scrollTo({
      y: Math.max(qualityPanelPosition.current - 24, 0),
      animated: true,
    })
  }

  const focusBlockingQualityItem = (itemId: string) => {
    const itemFieldMap: Partial<Record<string, keyof ListingFormValues>> = {
      title: 'title',
      description: 'description',
      price: 'price',
      location: 'city',
    }

    const targetField = itemFieldMap[itemId]

    if (targetField) {
      scrollToField(targetField)
      return
    }

    scrollToQualityPanel()
  }

  const buildPublishQualityItems = useCallback((
    values: Pick<
      ListingFormValues,
      | 'title'
      | 'description'
      | 'price'
      | 'city'
      | 'address'
      | 'latitude'
      | 'longitude'
      | 'image_url'
    >,
  ): PublishQualityItem[] => {
    const title = values.title?.trim() ?? ''
    const description = values.description?.trim() ?? ''
    const city = values.city?.trim() ?? ''
    const address = values.address?.trim() ?? ''
    const price = Number(values.price)
    const hasImage = hasText(values.image_url)
    const hasPin = values.latitude != null && values.longitude != null

    return [
      {
        id: 'title',
        label: 'Clear title',
        description:
          title.length >= 8
            ? 'Your title is specific enough for buyers to scan quickly.'
            : 'Make the title a bit more specific so buyers know what is being sold.',
        status: title.length >= 8 ? 'pass' : 'fail',
      },
      {
        id: 'description',
        label: 'Useful description',
        description:
          description.length >= 24
            ? 'Your description gives buyers enough context to understand the listing.'
            : 'Add a fuller description with condition, packaging, or pickup details.',
        status: description.length >= 24 ? 'pass' : 'fail',
      },
      {
        id: 'price',
        label: 'Buyer-ready price',
        description:
          Number.isFinite(price) && price > 0
            ? 'Your listing has a visible price buyers can compare.'
            : 'Set a price above zero before publishing this listing.',
        status: Number.isFinite(price) && price > 0 ? 'pass' : 'fail',
      },
      {
        id: 'location',
        label: 'Location details',
        description:
          hasText(city) && hasText(address)
            ? 'City and pickup area are filled in for buyer coordination.'
            : 'Add both city and address so buyers know where the waste is located.',
        status: hasText(city) && hasText(address) ? 'pass' : 'fail',
      },
      {
        id: 'map-pin',
        label: 'Exact map pin',
        description: hasPin
          ? 'Your map pin helps nearby buyers judge distance and pickup practicality.'
          : 'Place a pin on the map so buyers can see the exact area before they inquire.',
        status: hasPin ? 'pass' : 'fail',
      },
      {
        id: 'photo',
        label: 'Listing photo',
        description: !hasImage
          ? 'Add a product photo so buyers can trust what they are seeing.'
          : !aiListingAssistEnabled
            ? 'A photo is attached and ready to publish.'
            : !photoCheckResult
              ? 'A photo is attached. Run Check photo for extra quality feedback.'
              : photoCheckResult.result.readiness === 'retake'
                ? 'The current photo should be retaken before publishing.'
                : photoCheckResult.result.readiness === 'needs_review'
                  ? 'The photo is attached, but the checker suggests a quick review first.'
                  : 'The photo check says this image looks ready for the marketplace.',
        status: !hasImage
          ? 'fail'
          : !aiListingAssistEnabled
            ? 'pass'
            : !photoCheckResult
              ? 'warn'
              : photoCheckResult.result.readiness === 'retake'
                ? 'fail'
                : photoCheckResult.result.readiness === 'needs_review'
                  ? 'warn'
                  : 'pass',
      },
      {
        id: 'safety',
        label: 'Safety review',
        description: !aiListingAssistEnabled
          ? 'AI safety review is off, so only manual quality checks are active right now.'
          : !moderationResult
            ? 'AI safety review will run automatically when you publish.'
            : moderationResult.result.decision === 'allow'
              ? 'The AI safety check passed for this listing.'
              : moderationResult.result.decision === 'review'
                ? 'The AI safety check wants a review before this listing should go live.'
                : 'The AI safety check blocked this listing from publishing.',
        status: !aiListingAssistEnabled
          ? 'warn'
          : !moderationResult
            ? 'warn'
            : moderationResult.result.decision === 'allow'
              ? 'pass'
              : 'fail',
      },
    ]
  }, [moderationResult, photoCheckResult])

  const publishQualityItems = useMemo(
    () =>
      buildPublishQualityItems({
        title: titleValue,
        description: descriptionValue,
        price: priceValue,
        city: cityValue,
        address: addressValue,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        image_url: selectedImage,
      }),
    [
      buildPublishQualityItems,
      addressValue,
      cityValue,
      coordinates.latitude,
      coordinates.longitude,
      descriptionValue,
      priceValue,
      selectedImage,
      titleValue,
    ],
  )
  const blockingQualityItems = publishQualityItems.filter((item) => item.status === 'fail')
  const warningQualityItems = publishQualityItems.filter((item) => item.status === 'warn')
  const passedQualityItems = publishQualityItems.filter((item) => item.status === 'pass')
  const basicsSummary = selectedWasteTypeLabel
    ? `${selectedWasteTypeLabel} selected${hasText(titleValue) ? ' | title added' : ''}`
    : 'Choose a waste type and add a clear draft'
  const pricingSummary = [
    Number.isFinite(Number(priceValue)) && Number(priceValue) > 0
      ? `PHP ${Number(priceValue)}`
      : 'Price missing',
    Number.isFinite(Number(quantityValue)) && Number(quantityValue) > 0
      ? `${Number(quantityValue)} ${selectedUnit || 'units'}`
      : 'Quantity missing',
    hasText(cityValue) ? cityValue.trim() : 'City missing',
  ].join(' | ')
  const mapSummary =
    coordinates.latitude != null && coordinates.longitude != null
      ? 'Map pin set'
      : 'Optional but recommended for nearby buyers'
  const photoSummary = selectedImage
    ? photoCheckResult
      ? `Image ready | ${photoCheckResult.result.readiness === 'good' ? 'checked' : photoCheckResult.result.readiness}`
      : 'Image attached'
    : 'No image yet'
  const checksSummary = `${passedQualityItems.length} passed | ${warningQualityItems.length} review | ${blockingQualityItems.length} fix`
  const aiSummary = aiAssistResult
    ? `Draft improved with ${aiAssistResult.provider === 'local_gemma' ? 'Local Gemma' : 'Gemini'}`
    : wasteAdviceResult
      ? 'Value advice ready'
      : aiHealth?.available
        ? `Available via ${primaryAiProviderLabel ?? 'AI'}`
        : aiHealthError ?? 'Unavailable right now'

  const toggleSection = (section: ListingSectionKey) => {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }))
  }

  useEffect(() => {
    if (selectedImage) {
      setOpenSections((current) =>
        current.photos ? current : { ...current, photos: true },
      )
    }
  }, [selectedImage])

  useEffect(() => {
    if (blockingQualityItems.length > 0 || moderationResult || photoCheckResult) {
      setOpenSections((current) =>
        current.checks ? current : { ...current, checks: true },
      )
    }
  }, [blockingQualityItems.length, moderationResult, photoCheckResult])

  useEffect(() => {
    if (aiAssistResult || wasteAdviceResult || aiHealthError) {
      setOpenSections((current) =>
        current.ai ? current : { ...current, ai: true },
      )
    }
  }, [aiAssistResult, wasteAdviceResult, aiHealthError])

  const onSubmit = handleSubmit(
    async (values) => {
      const qualityItems = buildPublishQualityItems(values)
      const blockingItems = qualityItems.filter((item) => item.status === 'fail')

      if (blockingItems.length > 0) {
        focusBlockingQualityItem(blockingItems[0]?.id ?? '')
        onError(blockingItems[0]?.description ?? 'Fix the listing quality issues before publishing.')
        return
      }

      if (aiListingAssistEnabled) {
        const canContinue = await runListingModeration(values)

        if (!canContinue) {
          return
        }
      }

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

  const handleSaveDraft = async () => {
    if (!onSaveDraftValues) {
      return
    }

    setIsSavingDraft(true)

    try {
      await onSaveDraftValues(getValues())
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handlePickImage = async () => {
    const imageUri = await pickAndCompressImage()

    if (!imageUri) {
      return
    }

    setValue('image_url', imageUri, { shouldValidate: true })
    onInfo('Image ready for upload.')
  }

  const runListingModeration = async (values: ListingFormValues) => {
    if (moderationResult?.result.safeToPublish) {
      return true
    }

    if (isCheckingAIHealth) {
      return false
    }

    if (!aiHealth?.available) {
      onInfo('AI moderation is unavailable right now. Continuing without it.')
      return true
    }

    setIsModerationLoading(true)

    try {
      let imageBase64: string | null = null
      let imageMimeType: string | null = null

      if (values.image_url && !values.image_url.startsWith('http')) {
        imageBase64 = await readImageAsBase64(values.image_url)
        imageMimeType = 'image/jpeg'
      }

      const result = await moderateListing({
        title: values.title.trim(),
        description: values.description.trim(),
        wasteType: values.waste_type ?? null,
        city: values.city.trim() || null,
        price: Number.isFinite(Number(values.price)) ? Number(values.price) : null,
        unit: values.unit.trim() || null,
        imageBase64,
        imageMimeType,
      })

      if (result.error || !result.data) {
        onInfo('AI moderation is unavailable right now. Continuing without it.')
        return true
      }

      setModerationResult(result.data)

      if (result.data.result.decision === 'allow') {
        onInfo('Safety check passed. Publishing listing.')
        return true
      }

      const primaryReason = result.data.queuedForReview
        ? result.data.result.decision === 'block'
          ? 'This listing was blocked and added to the admin review queue.'
          : 'This listing was flagged and added to the admin review queue.'
        : result.data.result.reasons[0] ??
          (result.data.result.decision === 'block'
            ? 'This listing was blocked by the safety check.'
            : 'Please review the flagged listing details before publishing.')

      onError(primaryReason)
      scrollViewRef.current?.scrollToEnd({ animated: true })
      return false
    } catch {
      onInfo('AI moderation is unavailable right now. Continuing without it.')
      return true
    } finally {
      setIsModerationLoading(false)
    }
  }

  const handleWasteValueAdvice = async () => {
    if (isCheckingAIHealth || !selectedWasteTypeLabel) {
      return
    }

    if (!aiHealth?.available) {
      onError('AI is unavailable right now. You can continue manually.')
      return
    }

    setIsWasteAdviceLoading(true)

    try {
      const result = await getWasteValueAdvice({
        wasteType: selectedWasteTypeLabel,
        city: watch('city')?.trim() || null,
      })

      if (result.error || !result.data) {
        onError(result.error?.message ?? 'Waste value advice is unavailable right now.')
        return
      }

      setWasteAdviceResult(result.data)
      onInfo('Waste value ideas are ready to review.')
    } finally {
      setIsWasteAdviceLoading(false)
    }
  }

  const handlePhotoCheck = async () => {
    if (!selectedImage) {
      onError('Add a listing photo first before running the photo checker.')
      return
    }

    if (selectedImage.startsWith('http')) {
      onInfo('Replace the image first if you want to run the photo checker again.')
      return
    }

    if (isCheckingAIHealth) {
      return
    }

    if (!aiHealth?.available) {
      onError('AI is unavailable right now. You can continue manually.')
      return
    }

    setIsPhotoCheckLoading(true)

    try {
      const imageBase64 = await readImageAsBase64(selectedImage)
      const result = await getPhotoCheck({
        imageBase64,
        imageMimeType: 'image/jpeg',
        wasteType: selectedWasteTypeLabel ?? selectedWasteType ?? null,
      })

      if (result.error || !result.data) {
        onError(result.error?.message ?? 'Photo check is unavailable right now.')
        return
      }

      setPhotoCheckResult(result.data)

      if (result.data.result.readiness === 'good') {
        onInfo('Photo check complete. This image looks ready for a listing.')
        return
      }

      if (result.data.result.readiness === 'retake') {
        onInfo('Photo check complete. A retake is recommended before publishing.')
        return
      }

      onInfo('Photo check complete. Review the suggestions before publishing.')
    } catch {
      onError('Photo check is unavailable right now. You can continue manually.')
    } finally {
      setIsPhotoCheckLoading(false)
    }
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={styles.keyboardShell}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {heroTitle || heroSubtitle ? (
            <View style={styles.hero}>
              {heroTitle ? <Text style={styles.title}>{heroTitle}</Text> : null}
              {heroSubtitle ? (
                <Text style={styles.subtitle}>{heroSubtitle}</Text>
              ) : null}
            </View>
          ) : null}

          <Pressable onPress={handlePickImage} style={styles.productPhotoCard}>
            {selectedImage ? (
              <>
                <Image source={{ uri: selectedImage }} style={styles.productPhotoImage} />
                <View style={styles.productPhotoOverlay}>
                  <Text style={styles.productPhotoActionText}>Replace photo</Text>
                </View>
              </>
            ) : (
              <View style={styles.productPhotoEmptyState}>
                <Text style={styles.productPhotoEmptyTitle}>Add product photo</Text>
                <Text style={styles.productPhotoEmptyText}>
                  Upload one clear image to show buyers what they will get.
                </Text>
                <View style={styles.productPhotoAction}>
                  <Text style={styles.productPhotoActionText}>Add photo</Text>
                </View>
              </View>
            )}
          </Pressable>

          <View style={styles.form}>
          <CollapsibleSection
            title="Basics"
            hint="Choose the waste type, then draft the listing."
            summary={basicsSummary}
            isOpen={openSections.basics}
            onToggle={() => toggleSection('basics')}
          >

            <View style={styles.selectorBlock}>
              <View onLayout={registerFieldPosition('waste_type')}>
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
                    ref={titleRef}
                    label="Listing title"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Dry rice straw for mushroom growing"
                    returnKeyType="next"
                    onSubmitEditing={() => descriptionRef.current?.focus()}
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
                    ref={descriptionRef}
                    label="Description"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Condition, moisture level, packaging, pickup notes"
                    multiline
                    returnKeyType="next"
                    blurOnSubmit
                    onSubmitEditing={() => priceRef.current?.focus()}
                    error={errors.description?.message}
                  />
                )}
              />
            </View>

          </CollapsibleSection>

          <CollapsibleSection
            title="Pricing and pickup"
            hint="Set the amount, unit, and where buyers can get it."
            summary={pricingSummary}
            isOpen={openSections.pricing}
            onToggle={() => toggleSection('pricing')}
          >

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
                      ref={priceRef}
                      label="Price"
                      value={String(value)}
                      onChangeText={onChange}
                      keyboardType="number-pad"
                      returnKeyType="next"
                      onSubmitEditing={() => quantityRef.current?.focus()}
                      helperText="Pesos only."
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
                      ref={quantityRef}
                      label="Quantity"
                      value={String(value)}
                      onChangeText={onChange}
                      keyboardType="number-pad"
                      returnKeyType="next"
                      onSubmitEditing={() => unitRef.current?.focus()}
                      helperText="Numbers only."
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
                      ref={unitRef}
                      label="Unit"
                      value={value}
                      onChangeText={onChange}
                      placeholder="kg"
                      returnKeyType="next"
                      onSubmitEditing={() => cityRef.current?.focus()}
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
                      ref={cityRef}
                      label="City"
                      value={value}
                      onChangeText={onChange}
                      placeholder="Malaybalay"
                      returnKeyType="next"
                      onSubmitEditing={() => addressRef.current?.focus()}
                      helperText="Buyer search city."
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
                    ref={addressRef}
                    label="Pickup address"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Purok 3, Malaybalay, Bukidnon"
                    returnKeyType="done"
                    onSubmitEditing={() => void onSubmit()}
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
          </CollapsibleSection>

          {aiListingAssistEnabled ? (
            <CollapsibleSection
              title="AI tools"
              hint="Use AI only after you have a rough draft or selected waste type."
              summary={aiSummary}
              isOpen={openSections.ai}
              onToggle={() => toggleSection('ai')}
            >
              {selectedWasteTypeLabel ? (
                <View style={styles.valueAdvisorCard}>
                  <View style={styles.valueAdvisorHeader}>
                    <View style={styles.valueAdvisorTextBlock}>
                      <Text style={styles.valueAdvisorTitle}>
                        Waste-to-value advisor
                      </Text>
                    </View>
                    <Pressable
                      disabled={isWasteAdviceLoading || isCheckingAIHealth}
                      onPress={handleWasteValueAdvice}
                      style={[
                        styles.valueAdvisorButton,
                        isWasteAdviceLoading || isCheckingAIHealth
                          ? styles.aiButtonDisabled
                          : null,
                      ]}
                    >
                      <Text style={styles.valueAdvisorButtonText}>
                        {isCheckingAIHealth
                          ? 'Checking...'
                          : isWasteAdviceLoading
                            ? 'Loading...'
                            : 'See ideas'}
                      </Text>
                    </Pressable>
                  </View>

                  {wasteAdviceResult ? (
                    <View style={styles.valueAdvisorContent}>
                      <Text style={styles.valueAdvisorMeta}>
                        Provider:{' '}
                        {wasteAdviceResult.provider === 'local_gemma'
                          ? 'Local Gemma'
                          : 'Gemini'}
                        {wasteAdviceResult.fallbackUsed ? ' | fallback used' : ''}
                      </Text>
                      {wasteAdviceResult.result.marketTip ? (
                        <Text style={styles.valueAdvisorTip}>
                          {wasteAdviceResult.result.marketTip}
                        </Text>
                      ) : null}
                      {wasteAdviceResult.result.uses.length > 0 ? (
                        <View style={styles.valueAdvisorListBlock}>
                          <Text style={styles.valueAdvisorListLabel}>
                            Possible uses
                          </Text>
                          {wasteAdviceResult.result.uses.map((item) => (
                            <Text key={item} style={styles.valueAdvisorListItem}>
                              - {item}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                      {wasteAdviceResult.result.cautions.length > 0 ? (
                        <View style={styles.valueAdvisorListBlock}>
                          <Text style={styles.valueAdvisorListLabel}>Cautions</Text>
                          {wasteAdviceResult.result.cautions.map((item) => (
                            <Text key={item} style={styles.valueAdvisorListItem}>
                              - {item}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                      {wasteAdviceResult.result.sourceBasis.length > 0 ? (
                        <View style={styles.valueAdvisorListBlock}>
                          <Text style={styles.valueAdvisorListLabel}>
                            Grounded in
                          </Text>
                          {wasteAdviceResult.result.sourceBasis.map((item) => (
                            <Text key={item} style={styles.valueAdvisorSourceItem}>
                              - {item}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}

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
                          ? 'Improve title and description'
                          : 'Retry AI check'}
                  </Text>
                </Pressable>
                {aiHealth?.available ? (
                  <Text style={styles.aiMeta}>
                    Refines your draft with {primaryAiProviderLabel ?? 'AI'}
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
            </CollapsibleSection>
          ) : null}

          <CollapsibleSection
            title="Map pin"
            hint="Drop a pin so buyers can judge pickup distance quickly."
            summary={mapSummary}
            isOpen={openSections.map}
            onToggle={() => toggleSection('map')}
          >

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
          </CollapsibleSection>

          <CollapsibleSection
            title="Photos"
            hint="Add one clear image and optionally run the AI check before publishing."
            summary={photoSummary}
            isOpen={openSections.photos}
            onToggle={() => toggleSection('photos')}
          >

            {selectedImage ? (
              <>
                {aiListingAssistEnabled ? (
                  <View style={styles.photoCheckCard}>
                    <View style={styles.photoCheckHeader}>
                      <View style={styles.photoCheckTextBlock}>
                        <Text style={styles.photoCheckTitle}>Photo check</Text>
                      </View>
                      <Pressable
                        disabled={isPhotoCheckLoading || isCheckingAIHealth}
                        onPress={handlePhotoCheck}
                        style={[
                          styles.photoCheckButton,
                          isPhotoCheckLoading || isCheckingAIHealth
                            ? styles.aiButtonDisabled
                            : null,
                        ]}
                      >
                        <Text style={styles.photoCheckButtonText}>
                          {isCheckingAIHealth
                            ? 'Checking...'
                            : isPhotoCheckLoading
                              ? 'Reviewing...'
                              : canRunPhotoCheck
                                ? 'Check photo'
                                : 'Replace to check'}
                        </Text>
                      </Pressable>
                    </View>

                    {!canRunPhotoCheck ? (
                      <Text style={styles.photoCheckHint}>
                        Replace the current uploaded image if you want AI to review it again.
                      </Text>
                    ) : null}

                    {photoCheckResult ? (
                      <View style={styles.photoCheckResultCard}>
                        <View style={styles.photoCheckResultHeader}>
                          <View style={styles.photoCheckScoreBlock}>
                            <Text style={styles.photoCheckScoreValue}>
                              {photoCheckResult.result.qualityScore}
                            </Text>
                            <Text style={styles.photoCheckScoreLabel}>
                              quality score
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.photoCheckBadge,
                              photoCheckResult.result.readiness === 'good'
                                ? styles.photoCheckBadgeGood
                                : photoCheckResult.result.readiness === 'retake'
                                  ? styles.photoCheckBadgeRetake
                                  : styles.photoCheckBadgeReview,
                            ]}
                          >
                            <Text style={styles.photoCheckBadgeText}>
                              {photoCheckResult.result.readiness === 'good'
                                ? 'Looks good'
                                : photoCheckResult.result.readiness === 'retake'
                                  ? 'Retake suggested'
                                  : 'Needs review'}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.photoCheckMeta}>
                          Provider:{' '}
                          {photoCheckResult.provider === 'local_gemma'
                            ? 'Local Gemma'
                            : 'Gemini'}
                          {photoCheckResult.fallbackUsed ? ' | fallback used' : ''}
                        </Text>

                        {photoCheckResult.result.retakeSuggestions.length > 0 ? (
                          <View style={styles.photoCheckListBlock}>
                            <Text style={styles.photoCheckListLabel}>
                              Retake suggestions
                            </Text>
                            {photoCheckResult.result.retakeSuggestions.map((item) => (
                              <Text key={item} style={styles.photoCheckListItem}>
                                - {item}
                              </Text>
                            ))}
                          </View>
                        ) : null}

                        {photoCheckResult.result.likelyWasteType &&
                        photoCheckResult.result.likelyWasteTypeConfidence === 'high' ? (
                          <Text style={styles.photoCheckLikelyType}>
                            Likely waste type: {photoCheckResult.result.likelyWasteType}
                          </Text>
                        ) : null}

                        {photoCheckResult.result.notes.length > 0 ? (
                          <View style={styles.photoCheckListBlock}>
                            <Text style={styles.photoCheckListLabel}>Notes</Text>
                            {photoCheckResult.result.notes.map((item) => (
                              <Text key={item} style={styles.photoCheckListItem}>
                                - {item}
                              </Text>
                            ))}
                          </View>
                        ) : null}

                        {photoCheckResult.result.moderationStatus === 'review' ? (
                          <Text style={styles.photoCheckModeration}>
                            This image may need a manual review before it is safe to
                            trust as a marketplace photo.
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : null}

          </CollapsibleSection>

          <CollapsibleSection
            title="Publish checks"
            hint="Fix blockers here before the listing goes live."
            summary={checksSummary}
            isOpen={openSections.checks}
            onToggle={() => toggleSection('checks')}
          >

            <View
              onLayout={(event) => {
                qualityPanelPosition.current = event.nativeEvent.layout.y
              }}
              style={styles.qualityCard}
            >
              <View style={styles.qualityHeader}>
                <View style={styles.qualityTextBlock}>
                  <Text style={styles.qualityTitle}>Publish readiness</Text>
                </View>
                <View
                  style={[
                    styles.qualityBadge,
                    blockingQualityItems.length > 0
                      ? styles.qualityBadgeFail
                      : warningQualityItems.length > 0
                        ? styles.qualityBadgeWarn
                        : styles.qualityBadgePass,
                  ]}
                >
                  <Text style={styles.qualityBadgeText}>
                    {blockingQualityItems.length > 0
                      ? `${blockingQualityItems.length} fix`
                      : warningQualityItems.length > 0
                        ? `${warningQualityItems.length} review`
                        : 'Ready'}
                  </Text>
                </View>
              </View>

              <Text style={styles.qualitySummary}>
                {passedQualityItems.length} passed
                {warningQualityItems.length > 0 ? ` | ${warningQualityItems.length} review` : ''}
                {blockingQualityItems.length > 0 ? ` | ${blockingQualityItems.length} fix now` : ''}
              </Text>

              <View style={styles.qualityList}>
                {publishQualityItems.map((item) => (
                  <View key={item.id} style={styles.qualityItem}>
                    <View
                      style={[
                        styles.qualityItemBadge,
                        item.status === 'pass'
                          ? styles.qualityItemBadgePass
                          : item.status === 'warn'
                            ? styles.qualityItemBadgeWarn
                            : styles.qualityItemBadgeFail,
                      ]}
                    >
                      <Text style={styles.qualityItemBadgeText}>
                        {item.status === 'pass'
                          ? 'Pass'
                          : item.status === 'warn'
                            ? 'Review'
                            : 'Fix'}
                      </Text>
                    </View>
                    <View style={styles.qualityItemText}>
                      <Text style={styles.qualityItemTitle}>{item.label}</Text>
                      <Text style={styles.qualityItemDescription}>{item.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {aiListingAssistEnabled ? (
              <View style={styles.moderationCard}>
                <View style={styles.moderationHeader}>
                  <View style={styles.moderationTextBlock}>
                    <Text style={styles.moderationTitle}>Listing safety check</Text>
                  </View>
                  {isModerationLoading ? (
                    <View style={styles.moderationBadgePending}>
                      <Text style={styles.moderationBadgeText}>Checking</Text>
                    </View>
                  ) : moderationResult ? (
                    <View
                      style={[
                        styles.moderationBadge,
                        moderationResult.result.decision === 'allow'
                          ? styles.moderationBadgeAllow
                          : moderationResult.result.decision === 'block'
                            ? styles.moderationBadgeBlock
                            : styles.moderationBadgeReview,
                      ]}
                    >
                      <Text style={styles.moderationBadgeText}>
                        {moderationResult.result.decision === 'allow'
                          ? 'Ready'
                          : moderationResult.result.decision === 'block'
                            ? 'Blocked'
                            : 'Needs review'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.moderationBadgePending}>
                      <Text style={styles.moderationBadgeText}>Runs on publish</Text>
                    </View>
                  )}
                </View>

                {moderationResult ? (
                  <View style={styles.moderationResultCard}>
                    <Text style={styles.moderationMeta}>
                      Provider:{' '}
                      {moderationResult.provider === 'local_gemma'
                        ? 'Local Gemma'
                        : 'Gemini'}
                      {moderationResult.fallbackUsed ? ' | fallback used' : ''}
                    </Text>

                    {moderationResult.result.reasons.length > 0 ? (
                      <View style={styles.moderationListBlock}>
                        <Text style={styles.moderationListLabel}>Decision notes</Text>
                        {moderationResult.result.reasons.map((item) => (
                          <Text key={item} style={styles.moderationListItem}>
                            - {item}
                          </Text>
                        ))}
                      </View>
                    ) : null}

                    {moderationResult.queuedForReview ? (
                      <Text style={styles.moderationQueueNote}>
                        Added to admin review queue
                        {moderationResult.reviewQueueId ? `: ${moderationResult.reviewQueueId}` : ''}
                      </Text>
                    ) : null}

                    {moderationResult.result.fieldWarnings.length > 0 ? (
                      <View style={styles.moderationListBlock}>
                        <Text style={styles.moderationListLabel}>Text warnings</Text>
                        {moderationResult.result.fieldWarnings.map((item) => (
                          <Text key={item} style={styles.moderationListItem}>
                            - {item}
                          </Text>
                        ))}
                      </View>
                    ) : null}

                    {moderationResult.result.imageWarnings.length > 0 ? (
                      <View style={styles.moderationListBlock}>
                        <Text style={styles.moderationListLabel}>Image warnings</Text>
                        {moderationResult.result.imageWarnings.map((item) => (
                          <Text key={item} style={styles.moderationListItem}>
                            - {item}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.moderationHint}>
                    Publish will automatically run the AI safety check and stop if the
                    listing needs review.
                  </Text>
                )}
              </View>
            ) : null}
          </CollapsibleSection>

          </View>
          <View style={styles.submitRow}>
            {onSaveDraftValues ? (
              <Pressable
                disabled={isSavingDraft || isSubmitting}
                onPress={() => void handleSaveDraft()}
                style={styles.draftButton}
              >
                <Text style={styles.draftButtonText}>
                  {isSavingDraft ? draftSavedLabel : draftLabel}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              disabled={isSubmitting || isModerationLoading || isSavingDraft}
              onPress={onSubmit}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting
                  ? submittingLabel
                  : isModerationLoading
                    ? 'Running safety check...'
                    : blockingQualityItems.length > 0
                      ? 'Fix quality issues first'
                    : submitLabel}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  keyboardShell: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 12,
  },
  hero: {
    gap: 2,
  },
  title: {
    color: palette.soil,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  productPhotoCard: {
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(28, 16, 10, 0.08)',
    backgroundColor: palette.surface,
    position: 'relative',
  },
  productPhotoImage: {
    width: '100%',
    height: 210,
    backgroundColor: palette.parchment,
  },
  productPhotoOverlay: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(28, 16, 10, 0.72)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  productPhotoEmptyState: {
    minHeight: 210,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 10,
    backgroundColor: '#f4f7f1',
  },
  productPhotoEmptyTitle: {
    color: palette.soil,
    fontSize: 17,
    fontWeight: '800',
  },
  productPhotoEmptyText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  productPhotoAction: {
    borderRadius: 999,
    backgroundColor: palette.sageDark,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  productPhotoActionText: {
    color: palette.cream,
    fontSize: 13,
    fontWeight: '800',
  },
  form: {
    gap: 10,
  },
  sectionCard: {
    gap: 10,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
  },
  sectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionToggleText: {
    flex: 1,
    gap: 2,
  },
  sectionToggleBadge: {
    borderRadius: 999,
    backgroundColor: palette.parchment,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sectionToggleBadgeText: {
    color: palette.clay,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sectionHeader: {
    gap: 3,
  },
  sectionTitle: {
    color: palette.soil,
    fontSize: 14,
    fontWeight: '800',
  },
  sectionHint: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  aiSection: {
    gap: 8,
  },
  aiButton: {
    backgroundColor: palette.sageDark,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 11,
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
    fontSize: 12,
    lineHeight: 17,
  },
  aiUnavailableCard: {
    gap: 4,
    backgroundColor: '#fbf0ec',
    borderWidth: 1,
    borderColor: 'rgba(173, 72, 34, 0.18)',
    borderRadius: radii.md,
    padding: 12,
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
    gap: 8,
    backgroundColor: palette.parchment,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    padding: 12,
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
    gap: 4,
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
  valueAdvisorCard: {
    gap: 10,
    backgroundColor: '#eef6ed',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
    padding: 12,
  },
  valueAdvisorHeader: {
    gap: 8,
  },
  valueAdvisorTextBlock: {
    gap: 4,
  },
  valueAdvisorTitle: {
    color: palette.sageDark,
    fontSize: 15,
    fontWeight: '800',
  },
  valueAdvisorSubtitle: {
    color: '#5f7166',
    fontSize: 13,
    lineHeight: 19,
  },
  valueAdvisorButton: {
    alignSelf: 'flex-start',
    backgroundColor: palette.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  valueAdvisorButtonText: {
    color: palette.sageDark,
    fontSize: 13,
    fontWeight: '800',
  },
  valueAdvisorContent: {
    gap: 8,
    backgroundColor: palette.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.08)',
    padding: 12,
  },
  valueAdvisorMeta: {
    color: palette.muted,
    fontSize: 12,
  },
  valueAdvisorTip: {
    color: palette.soil,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  valueAdvisorListBlock: {
    gap: 6,
  },
  valueAdvisorListLabel: {
    color: palette.sageDark,
    fontSize: 13,
    fontWeight: '800',
  },
  valueAdvisorListItem: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  valueAdvisorSourceItem: {
    color: palette.sageDark,
    fontSize: 12,
    lineHeight: 18,
  },
  aiFeedbackActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  aiFeedbackPrimaryButton: {
    flex: 1,
    backgroundColor: palette.sageDark,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiFeedbackSecondaryButton: {
    flex: 1,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: 'rgba(160, 69, 50, 0.18)',
    borderRadius: 999,
    paddingVertical: 10,
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
    gap: 8,
  },
  selectorLabel: {
    color: palette.soil,
    fontWeight: '700',
    fontSize: 14,
  },
  selectorWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorChip: {
    backgroundColor: palette.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  qualityCard: {
    gap: 8,
    backgroundColor: '#f4f7f1',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
    padding: 10,
  },
  qualityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  qualityTextBlock: {
    flex: 1,
    gap: 4,
  },
  qualityTitle: {
    color: palette.soil,
    fontSize: 15,
    fontWeight: '800',
  },
  qualitySubtitle: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  qualityBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  qualityBadgePass: {
    backgroundColor: 'rgba(58, 102, 72, 0.14)',
  },
  qualityBadgeWarn: {
    backgroundColor: 'rgba(176, 126, 40, 0.14)',
  },
  qualityBadgeFail: {
    backgroundColor: 'rgba(160, 69, 50, 0.12)',
  },
  qualityBadgeText: {
    color: palette.soil,
    fontSize: 12,
    fontWeight: '800',
  },
  qualitySummary: {
    color: palette.sageDark,
    fontSize: 12,
    fontWeight: '700',
  },
  qualityList: {
    gap: 6,
  },
  qualityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: palette.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.08)',
    padding: 8,
  },
  qualityItemBadge: {
    minWidth: 54,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  qualityItemBadgePass: {
    backgroundColor: 'rgba(58, 102, 72, 0.14)',
  },
  qualityItemBadgeWarn: {
    backgroundColor: 'rgba(176, 126, 40, 0.14)',
  },
  qualityItemBadgeFail: {
    backgroundColor: 'rgba(160, 69, 50, 0.12)',
  },
  qualityItemBadgeText: {
    color: palette.soil,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  qualityItemText: {
    flex: 1,
    gap: 3,
  },
  qualityItemTitle: {
    color: palette.soil,
    fontSize: 13,
    fontWeight: '800',
  },
  qualityItemDescription: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  submitRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  draftButton: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  draftButtonText: {
    color: palette.clay,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: palette.sage,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: palette.cream,
    fontWeight: '800',
  },
  photoCheckCard: {
    gap: 10,
    backgroundColor: '#f3f7f2',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
    padding: 12,
  },
  photoCheckHeader: {
    gap: 8,
  },
  photoCheckTextBlock: {
    gap: 4,
  },
  photoCheckTitle: {
    color: palette.sageDark,
    fontSize: 15,
    fontWeight: '800',
  },
  photoCheckSubtitle: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  photoCheckButton: {
    alignSelf: 'flex-start',
    backgroundColor: palette.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  photoCheckButtonText: {
    color: palette.sageDark,
    fontSize: 13,
    fontWeight: '800',
  },
  photoCheckHint: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  photoCheckResultCard: {
    gap: 8,
    backgroundColor: palette.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.08)',
    padding: 12,
  },
  photoCheckResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  photoCheckScoreBlock: {
    gap: 2,
  },
  photoCheckScoreValue: {
    color: palette.soil,
    fontSize: 24,
    fontWeight: '800',
  },
  photoCheckScoreLabel: {
    color: palette.muted,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  photoCheckBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  photoCheckBadgeGood: {
    backgroundColor: 'rgba(58, 102, 72, 0.14)',
  },
  photoCheckBadgeReview: {
    backgroundColor: 'rgba(176, 126, 40, 0.14)',
  },
  photoCheckBadgeRetake: {
    backgroundColor: 'rgba(160, 69, 50, 0.12)',
  },
  photoCheckBadgeText: {
    color: palette.soil,
    fontSize: 12,
    fontWeight: '800',
  },
  photoCheckMeta: {
    color: palette.muted,
    fontSize: 12,
  },
  photoCheckListBlock: {
    gap: 6,
  },
  photoCheckListLabel: {
    color: palette.sageDark,
    fontSize: 13,
    fontWeight: '800',
  },
  photoCheckListItem: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  photoCheckLikelyType: {
    color: palette.soil,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  photoCheckModeration: {
    color: palette.error,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  moderationCard: {
    gap: 10,
    backgroundColor: '#f8f5ee',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(87, 68, 42, 0.12)',
    padding: 12,
  },
  moderationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  moderationTextBlock: {
    flex: 1,
    gap: 4,
  },
  moderationTitle: {
    color: palette.soil,
    fontSize: 15,
    fontWeight: '800',
  },
  moderationSubtitle: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  moderationBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  moderationBadgePending: {
    borderRadius: 999,
    backgroundColor: 'rgba(87, 68, 42, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  moderationBadgeAllow: {
    backgroundColor: 'rgba(58, 102, 72, 0.14)',
  },
  moderationBadgeReview: {
    backgroundColor: 'rgba(176, 126, 40, 0.14)',
  },
  moderationBadgeBlock: {
    backgroundColor: 'rgba(160, 69, 50, 0.12)',
  },
  moderationBadgeText: {
    color: palette.soil,
    fontSize: 12,
    fontWeight: '800',
  },
  moderationHint: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  moderationResultCard: {
    gap: 8,
    backgroundColor: palette.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(87, 68, 42, 0.08)',
    padding: 12,
  },
  moderationMeta: {
    color: palette.muted,
    fontSize: 12,
  },
  moderationQueueNote: {
    color: palette.sageDark,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  moderationListBlock: {
    gap: 6,
  },
  moderationListLabel: {
    color: palette.soil,
    fontSize: 13,
    fontWeight: '800',
  },
  moderationListItem: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  toggleCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
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

