import { zodResolver } from '@hookform/resolvers/zod'
import * as Linking from 'expo-linking'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { FormField } from '../../components/FormField'
import { VerifiedBadge } from '../../components/VerifiedBadge'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { useConnectivity } from '../../hooks/useConnectivity'
import { useProfile } from '../../hooks/useProfile'
import {
  getVerificationDocumentSignedUrl,
  uploadVerificationDocument,
} from '../../services/storageService'
import {
  getLatestSellerVerificationRequest,
  submitSellerVerificationRequest,
} from '../../services/sellerVerificationService'
import type { SellerVerificationDocumentType } from '../../types/app'
import type { SellerVerificationFormValues } from '../../utils/schemas'
import { sellerVerificationSchema } from '../../utils/schemas'
import { pickAndCompressImage } from '../../utils/imageUtils'
import { getProfileCompletion } from '../../utils/profileCompletion'
import { palette, radii, shadow } from '../../utils/theme'

const DOCUMENT_OPTIONS: Array<{
  value: SellerVerificationDocumentType
  label: string
}> = [
  { value: 'government_id', label: 'Government ID' },
  { value: 'farm_id', label: 'Farm ID' },
  { value: 'business_permit', label: 'Business permit' },
  { value: 'cooperative_certificate', label: 'Cooperative certificate' },
  { value: 'other', label: 'Other proof' },
]

function formatTimestamp(value: string | null) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function SellerVerificationScreen() {
  const { user, role } = useAuth()
  const { isOffline } = useConnectivity()
  const { showToast } = useToast()
  const { profile, isLoading: isProfileLoading, error: profileError, refetch: refetchProfile } =
    useProfile(user?.id)
  const [documentUri, setDocumentUri] = useState<string | null>(null)
  const [request, setRequest] = useState<Awaited<
    ReturnType<typeof getLatestSellerVerificationRequest>
  >['data']>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [isLoadingRequest, setIsLoadingRequest] = useState(true)
  const [isUploadingDocument, setIsUploadingDocument] = useState(false)
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SellerVerificationFormValues>({
    resolver: zodResolver(sellerVerificationSchema),
    defaultValues: {
      documentType: 'government_id',
      documentNumber: '',
      notes: '',
    },
  })

  const profileCompletion = useMemo(
    () => getProfileCompletion(profile, 'farmer'),
    [profile],
  )

  const loadRequest = async () => {
    if (!user) {
      setIsLoadingRequest(false)
      setRequest(null)
      return
    }

    setIsLoadingRequest(true)
    const result = await getLatestSellerVerificationRequest(user.id)

    if (result.error) {
      setRequestError(result.error.message)
      setRequest(null)
      setIsLoadingRequest(false)
      return
    }

    setRequest(result.data)
    setRequestError(null)
    setIsLoadingRequest(false)
  }

  useEffect(() => {
    void loadRequest()
  }, [user?.id])

  useEffect(() => {
    reset({
      documentType: request?.documentType ?? 'government_id',
      documentNumber: request?.documentNumber ?? '',
      notes: request?.notes ?? '',
    })
  }, [request, reset])

  const watchedDocumentType = watch('documentType')

  const handlePickDocument = async () => {
    if (isOffline) {
      showToast('Reconnect before uploading proof documents.', 'info')
      return
    }

    const nextUri = await pickAndCompressImage()

    if (!nextUri) {
      return
    }

    setDocumentUri(nextUri)
    showToast('Document selected. Submit when you are ready.', 'success')
  }

  const handleOpenCurrentDocument = async () => {
    if (!request?.documentPath) {
      return
    }

    const result = await getVerificationDocumentSignedUrl(request.documentPath)

    if (result.error || !result.data) {
      showToast(result.error?.message ?? 'Unable to open the uploaded document.', 'error')
      return
    }

    await Linking.openURL(result.data)
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!user) {
      showToast('Sign in before submitting verification.', 'error')
      return
    }

    if (role !== 'farmer') {
      showToast('Only seller accounts can request verification.', 'error')
      return
    }

    if (isOffline) {
      showToast('Reconnect before submitting verification.', 'info')
      return
    }

    if (!profileCompletion.isComplete) {
      showToast('Complete your seller profile before requesting verification.', 'error')
      return
    }

    let documentPath = request?.documentPath ?? ''

    if (documentUri) {
      setIsUploadingDocument(true)
      const uploadResult = await uploadVerificationDocument(documentUri, user.id)
      setIsUploadingDocument(false)

      if (uploadResult.error || !uploadResult.data) {
        showToast(uploadResult.error?.message ?? 'Unable to upload the verification document.', 'error')
        return
      }

      documentPath = uploadResult.data
    }

    if (!documentPath) {
      showToast('Upload a proof document before submitting verification.', 'error')
      return
    }

    const result = await submitSellerVerificationRequest({
      sellerId: user.id,
      documentType: values.documentType,
      documentNumber: values.documentNumber,
      notes: values.notes,
      documentPath,
    })

    if (result.error) {
      showToast(result.error.message, 'error')
      return
    }

    setDocumentUri(null)
    await loadRequest()
    await refetchProfile()
    showToast('Verification request submitted for admin review.', 'success')
  })

  if (role !== 'farmer') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateWrap}>
          <EmptyState
            title="Seller access required"
            description="Only seller accounts can submit verification documents."
          />
        </View>
      </SafeAreaView>
    )
  }

  if (profileError && !profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateWrap}>
          <ErrorState
            title="Verification unavailable"
            description={profileError.message}
            onAction={() => {
              void refetchProfile()
            }}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>Seller verification</Text>
          <Text style={styles.subtitle}>
            Submit a document so Refamora admins can verify your seller account and show a trust
            badge to buyers.
          </Text>
        </View>

        {profile?.is_verified ? (
          <View style={styles.card}>
            <VerifiedBadge label="Verified seller" />
            <Text style={styles.cardTitle}>Your seller account is verified</Text>
            <Text style={styles.cardText}>
              Buyers can now see a verified badge on your seller profile and listings.
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile readiness</Text>
          <Text style={styles.cardText}>
            {profileCompletion.isComplete
              ? 'Your seller profile is complete and ready for verification review.'
              : 'Complete your seller profile before submitting verification documents.'}
          </Text>
          <Text style={styles.helperText}>
            {profileCompletion.isComplete
              ? 'All required seller profile details are in place.'
              : `Still missing: ${profileCompletion.missingLabels.join(', ')}.`}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current status</Text>
          {isLoadingRequest || isProfileLoading ? (
            <Text style={styles.cardText}>Loading verification status...</Text>
          ) : requestError ? (
            <Text style={styles.errorText}>{requestError}</Text>
          ) : request ? (
            <>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusBadge,
                    request.status === 'approved'
                      ? styles.statusPositive
                      : request.status === 'rejected'
                        ? styles.statusNegative
                        : styles.statusWarning,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>{request.status}</Text>
                </View>
                {request.status === 'approved' ? <VerifiedBadge /> : null}
              </View>
              <Text style={styles.cardText}>
                Submitted {formatTimestamp(request.createdAt) ?? 'recently'} with{' '}
                {DOCUMENT_OPTIONS.find((option) => option.value === request.documentType)?.label ??
                  'document proof'}
                .
              </Text>
              {request.adminNote ? (
                <Text style={styles.helperText}>Admin note: {request.adminNote}</Text>
              ) : null}
              {request.reviewedAt ? (
                <Text style={styles.helperText}>
                  Last reviewed {formatTimestamp(request.reviewedAt) ?? 'recently'}.
                </Text>
              ) : null}
              <Pressable onPress={() => void handleOpenCurrentDocument()} style={styles.inlineButton}>
                <Text style={styles.inlineButtonText}>Open uploaded document</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.cardText}>
              No verification request has been submitted yet.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {request?.status === 'pending' ? 'Update pending request' : 'Submit documents'}
          </Text>
          <Text style={styles.cardText}>
            Use a clear document image. JPG, PNG, and WEBP are supported.
          </Text>

          <View style={styles.optionGrid}>
            {DOCUMENT_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setValue('documentType', option.value)}
                style={[
                  styles.optionChip,
                  watchedDocumentType === option.value ? styles.optionChipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    watchedDocumentType === option.value ? styles.optionChipTextActive : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Controller
            control={control}
            name="documentNumber"
            render={({ field: { onChange, value } }) => (
              <FormField
                label="Document number"
                value={value}
                onChangeText={onChange}
                placeholder="Enter the ID or permit number"
                error={errors.documentNumber?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <FormField
                label="Notes"
                value={value ?? ''}
                onChangeText={onChange}
                placeholder="Optional note for the admin reviewer"
                multiline
                error={errors.notes?.message}
              />
            )}
          />

          <View style={styles.uploadCard}>
            <Text style={styles.uploadTitle}>
              {documentUri ? 'New document selected' : request?.documentPath ? 'Document on file' : 'Upload proof document'}
            </Text>
            <Text style={styles.uploadText}>
              {documentUri
                ? 'A new document is ready to upload with this submission.'
                : request?.documentPath
                  ? 'You can keep the current document or replace it with a new upload.'
                  : 'Choose a clear photo or scan of the proof document.'}
            </Text>
            <Pressable onPress={() => void handlePickDocument()} style={styles.inlineButton}>
              <Text style={styles.inlineButtonText}>
                {documentUri || request?.documentPath ? 'Replace document' : 'Choose document'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            disabled={
              isSubmitting ||
              isUploadingDocument ||
              isOffline ||
              !profileCompletion.isComplete ||
              request?.status === 'approved'
            }
            onPress={() => void onSubmit()}
            style={[
              styles.primaryButton,
              isSubmitting ||
              isUploadingDocument ||
              isOffline ||
              !profileCompletion.isComplete ||
              request?.status === 'approved'
                ? styles.buttonDisabled
                : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isUploadingDocument
                ? 'Uploading document...'
                : isSubmitting
                  ? 'Submitting request...'
                  : request?.status === 'approved'
                    ? 'Verification approved'
                    : request?.status === 'pending'
                      ? 'Update request'
                      : 'Submit verification'}
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
    padding: 20,
    gap: 16,
  },
  stateWrap: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  hero: {
    gap: 6,
  },
  title: {
    color: palette.soil,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 12,
    ...shadow,
  },
  cardTitle: {
    color: palette.soil,
    fontSize: 17,
    fontWeight: '800',
  },
  cardText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  helperText: {
    color: palette.sageDark,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  errorText: {
    color: palette.error,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusWarning: {
    backgroundColor: '#f5ecd6',
  },
  statusPositive: {
    backgroundColor: '#e8f2ea',
  },
  statusNegative: {
    backgroundColor: '#f9e4df',
  },
  statusBadgeText: {
    color: palette.soil,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionChipActive: {
    backgroundColor: '#eef5ef',
    borderColor: 'rgba(58, 102, 72, 0.18)',
  },
  optionChipText: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '700',
  },
  optionChipTextActive: {
    color: palette.sageDark,
  },
  uploadCard: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#fafbfa',
    padding: 14,
    gap: 6,
  },
  uploadTitle: {
    color: palette.soil,
    fontSize: 14,
    fontWeight: '800',
  },
  uploadText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  inlineButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: palette.parchment,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inlineButtonText: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '800',
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: palette.sage,
    alignItems: 'center',
    paddingVertical: 15,
  },
  primaryButtonText: {
    color: palette.cream,
    fontSize: 14,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
})
