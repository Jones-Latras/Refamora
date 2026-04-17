import { zodResolver } from '@hookform/resolvers/zod'
import { router } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'

import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { FormField } from '../../components/FormField'
import { ProfileScreenSkeleton } from '../../components/ScreenSkeleton'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { useConnectivity } from '../../hooks/useConnectivity'
import { useProfile } from '../../hooks/useProfile'
import { signOut, updatePassword } from '../../services/authService'
import { updateUserProfile } from '../../services/profileService'
import { uploadAvatarImage } from '../../services/storageService'
import type {
  PasswordChangeFormValues,
  ProfileFormValues,
} from '../../utils/schemas'
import {
  passwordChangeSchema,
  profileSchema,
} from '../../utils/schemas'
import { pickAndCompressAvatar } from '../../utils/imageUtils'
import { getProfileCompletion } from '../../utils/profileCompletion'
import { palette, radii, shadow } from '../../utils/theme'

function getInitials(name?: string | null, fallback = 'A') {
  if (!name) {
    return fallback.charAt(0).toUpperCase()
  }

  const parts = name.split(' ').filter(Boolean)

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export default function ProfileScreen() {
  const { user, role } = useAuth()
  const { isOffline } = useConnectivity()
  const { showToast } = useToast()
  const { profile, isLoading, error, refetch } = useProfile(user?.id)
  const scrollViewRef = useRef<ScrollView>(null)
  const fullNameRef = useRef<TextInput>(null)
  const phoneRef = useRef<TextInput>(null)
  const cityRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const confirmPasswordRef = useRef<TextInput>(null)
  const fieldPositions = useRef<Record<string, number>>({})
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      city: '',
      avatar_url: null,
    },
  })

  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    watch: watchPassword,
    formState: {
      errors: passwordErrors,
      isSubmitting: isUpdatingPassword,
      isDirty: isPasswordDirty,
    },
  } = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    if (!profile) {
      return
    }

    reset({
      full_name: profile.full_name ?? '',
      phone: profile.phone ?? '',
      city: profile.city ?? '',
      avatar_url: profile.avatar_url ?? null,
    })
  }, [profile, reset])

  const watchedProfile = watch()
  const watchedPassword = watchPassword()

  const hasProfileChanges = useMemo(() => {
    if (!profile) {
      return false
    }

    return (
      (watchedProfile.full_name ?? '') !== (profile.full_name ?? '') ||
      (watchedProfile.phone ?? '') !== (profile.phone ?? '') ||
      (watchedProfile.city ?? '') !== (profile.city ?? '')
    )
  }, [profile, watchedProfile.city, watchedProfile.full_name, watchedProfile.phone])

  const canSubmitPassword =
    isPasswordDirty &&
    Boolean(watchedPassword.password) &&
    Boolean(watchedPassword.confirmPassword) &&
    !passwordErrors.password &&
    !passwordErrors.confirmPassword

  const normalizedRole = role === 'farmer' ? 'farmer' : 'buyer'
  const roleLabel = normalizedRole === 'farmer' ? 'Farmer seller' : 'Buyer account'
  const locationLabel = profile?.city ? `${roleLabel} from ${profile.city}` : roleLabel
  const profileCompletion = useMemo(
    () => getProfileCompletion(profile, normalizedRole),
    [normalizedRole, profile],
  )

  const registerFieldPosition =
    (fieldName: string) =>
    (event: { nativeEvent: { layout: { y: number } } }) => {
      fieldPositions.current[fieldName] = event.nativeEvent.layout.y
    }

  const focusField = (fieldName: string) => {
    const y = fieldPositions.current[fieldName]

    if (typeof y === 'number') {
      scrollViewRef.current?.scrollTo({ y: Math.max(y - 24, 0), animated: true })
    }

    const refs: Record<string, RefObject<TextInput | null>> = {
      full_name: fullNameRef,
      phone: phoneRef,
      city: cityRef,
      password: passwordRef,
      confirmPassword: confirmPasswordRef,
    }

    refs[fieldName]?.current?.focus()
  }

  const handlePickAvatar = async () => {
    if (isOffline) {
      showToast('Reconnect before updating your profile photo.', 'info')
      return
    }

    if (!user) {
      showToast('Sign in before updating your profile photo.', 'error')
      return
    }

    const imageUri = await pickAndCompressAvatar()

    if (!imageUri) {
      return
    }

    setIsUploadingAvatar(true)
    const uploadResult = await uploadAvatarImage(imageUri, user.id)
    setIsUploadingAvatar(false)

    if (uploadResult.error || !uploadResult.data) {
      showToast({
        title: 'Photo upload failed',
        message:
          uploadResult.error?.message ??
          'Unable to upload photo. Check the image size, format, or connection and try again.',
        variant: 'error',
      })
      return
    }

    const updateResult = await updateUserProfile(user.id, {
      avatar_url: uploadResult.data,
    })

    if (updateResult.error) {
      showToast(updateResult.error.message, 'error')
      return
    }

    await refetch()
    showToast({
      title: 'Photo updated',
      message: 'Your new profile photo is now visible across Refamora.',
      variant: 'success',
    })
  }

  const handleSaveProfile = handleSubmit(
    async (values) => {
      if (isOffline) {
        showToast('Reconnect before saving profile changes.', 'info')
        return
      }

      if (!user) {
        showToast('Sign in before updating your profile.', 'error')
        return
      }

      const result = await updateUserProfile(user.id, {
        full_name: values.full_name,
        phone: values.phone,
        city: values.city,
      })

      if (result.error) {
        showToast(result.error.message, 'error')
        return
      }

      await refetch()
      showToast({
        title: 'Profile saved',
        message: 'Your updated details are now reflected across your account.',
        variant: 'success',
      })
    },
    (fieldErrors) => {
      const fieldOrder: ('full_name' | 'phone' | 'city')[] = [
        'full_name',
        'phone',
        'city',
      ]
      const firstErrorField = fieldOrder.find((fieldName) => fieldErrors[fieldName])

      if (firstErrorField) {
        focusField(firstErrorField)
        const message = fieldErrors[firstErrorField]?.message

        if (typeof message === 'string' && message.length > 0) {
          showToast(message, 'error')
          return
        }
      }

      showToast('Please complete the missing profile details before saving.', 'error')
    },
  )

  const handleSavePassword = handlePasswordSubmit(
    async (values) => {
      if (isOffline) {
        showToast('Reconnect before changing your password.', 'info')
        return
      }

      const result = await updatePassword(values.password)

      if (result.error) {
        showToast(result.error.message, 'error')
        return
      }

      resetPasswordForm()
      showToast({
        title: 'Password updated',
        message: 'Your account security has been refreshed successfully.',
        variant: 'success',
      })
    },
    (fieldErrors) => {
      const fieldOrder: ('password' | 'confirmPassword')[] = ['password', 'confirmPassword']
      const firstErrorField = fieldOrder.find((fieldName) => fieldErrors[fieldName])

      if (firstErrorField) {
        focusField(firstErrorField === 'confirmPassword' ? 'confirmPassword' : 'password')
        const message = fieldErrors[firstErrorField]?.message

        if (typeof message === 'string' && message.length > 0) {
          showToast(message, 'error')
          return
        }
      }

      showToast('Please fix the password fields before updating your account.', 'error')
    },
  )

  const handleLogout = async () => {
    await signOut()
    router.replace('/(auth)/login')
  }

  const handleVerificationPress = () => {
    if (normalizedRole !== 'farmer') {
      return
    }

    if (!profileCompletion.isComplete) {
      showToast(
        'Complete your seller profile first. Verification requests will open after that flow is ready.',
        'info',
      )
      return
    }

    showToast(
      'Seller verification requests are coming soon. Your profile is ready for future admin review.',
      'info',
    )
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <ProfileScreenSkeleton />
      </SafeAreaView>
    )
  }

  if (error && !profile) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.emptyWrapper}>
          <ErrorState
            title="Profile could not be loaded"
            description="Refamora could not load your account details right now. Try again to refresh your profile."
            onAction={() => {
              void refetch()
            }}
          />
        </View>
      </SafeAreaView>
    )
  }

  if (!profile) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.emptyWrapper}>
          <EmptyState
            title={isOffline ? 'Profile unavailable offline' : 'Profile setup is not ready yet'}
            description={
              isOffline
                ? 'Reconnect to load your saved profile details and continue editing your account.'
                : 'We could not load your saved profile details right now. Try refreshing this screen to pull your name, city, and contact information again.'
            }
            actionLabel={isOffline ? undefined : 'Try again'}
            onAction={isOffline ? undefined : () => void refetch()}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.cover}>
          <View style={styles.coverGlow} />
        </View>

        <View style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <Pressable
              disabled={isOffline || isUploadingAvatar}
              onPress={() => void handlePickAvatar()}
              style={styles.avatarPressable}
            >
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>
                    {getInitials(profile.full_name, user?.email ?? 'A')}
                  </Text>
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Text style={styles.avatarBadgeText}>+</Text>
              </View>
            </Pressable>
            <Pressable
              disabled={isOffline || isUploadingAvatar}
              onPress={() => void handlePickAvatar()}
            >
              <Text style={styles.avatarButtonText}>
                {isOffline
                  ? 'Reconnect to change photo'
                  : isUploadingAvatar
                    ? 'Uploading photo...'
                    : 'Change photo'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.identity}>
            <Text style={styles.name}>{profile.full_name ?? 'Refamora user'}</Text>
            <Text style={styles.roleLine}>{locationLabel}</Text>
            <Text style={styles.meta}>{profile.email ?? user?.email ?? 'No email'}</Text>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>Verified account</Text>
            </View>
            {profileCompletion.isComplete ? (
              <Text style={styles.readyText}>{profileCompletion.completeLabel}</Text>
            ) : null}
          </View>

          {!profileCompletion.isComplete ? (
            <View style={styles.completionCard}>
              <View style={styles.completionHeader}>
                <Text style={styles.completionTitle}>{profileCompletion.title}</Text>
                <Text style={styles.completionPercent}>{profileCompletion.percent}%</Text>
              </View>
              <Text style={styles.completionSummary}>{profileCompletion.summary}</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${profileCompletion.percent}%` }]}
                />
              </View>
              <Text style={styles.completionCount}>
                {profileCompletion.completedCount} of {profileCompletion.items.length} details
                complete
              </Text>
              <View style={styles.completionList}>
                {profileCompletion.items.map((item) => (
                  <View key={item.key} style={styles.completionItemRow}>
                    <Text style={styles.completionItemStatus}>
                      {item.done ? 'Done' : 'Add'}
                    </Text>
                    <View style={styles.completionItemText}>
                      <Text style={styles.completionItemLabel}>{item.label}</Text>
                      <Text style={styles.completionItemDescription}>{item.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {isOffline ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Offline mode</Text>
            <Text style={styles.offlineText}>
              You can still review your saved profile details, but photo uploads,
              profile updates, and password changes need a connection.
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personal information</Text>
          <View onLayout={registerFieldPosition('full_name')}>
            <Controller
              control={control}
              name="full_name"
              render={({ field: { onChange, value } }) => (
                <FormField
                  ref={fullNameRef}
                  label="Full name"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Your full name"
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  error={errors.full_name?.message}
                />
              )}
            />
          </View>
          <View onLayout={registerFieldPosition('phone')}>
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, value } }) => (
                <FormField
                  ref={phoneRef}
                  label="Phone"
                  value={value}
                  onChangeText={onChange}
                  placeholder="0917 123 4567"
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => cityRef.current?.focus()}
                  helperText="Use the number buyers or sellers can actually reach."
                  error={errors.phone?.message}
                />
              )}
            />
          </View>
          <View onLayout={registerFieldPosition('city')}>
            <Controller
              control={control}
              name="city"
              render={({ field: { onChange, value } }) => (
                <FormField
                  ref={cityRef}
                  label="City"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Cagayan de Oro"
                  returnKeyType="done"
                  onSubmitEditing={() => void handleSaveProfile()}
                  helperText="Use the city people will recognize when finding you."
                  error={errors.city?.message}
                />
              )}
            />
          </View>

          <Pressable
            disabled={isOffline || isSubmitting || !hasProfileChanges}
            onPress={() => void handleSaveProfile()}
            style={[
              styles.primaryButton,
              isOffline || isSubmitting || !hasProfileChanges ? styles.buttonDisabled : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'Saving...' : hasProfileChanges ? 'Save changes' : 'Up to date'}
            </Text>
          </Pressable>
        </View>

        {normalizedRole === 'farmer' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Seller verification</Text>
            <View style={styles.verificationHeader}>
              <View
                style={[
                  styles.verificationBadge,
                  profileCompletion.isComplete
                    ? styles.verificationBadgeReady
                    : styles.verificationBadgeLocked,
                ]}
              >
                <Text style={styles.verificationBadgeText}>
                  {profileCompletion.isComplete ? 'Coming soon' : 'Finish profile first'}
                </Text>
              </View>
              <Text style={styles.verificationMeta}>
                Future admin review placeholder
              </Text>
            </View>
            <Text style={styles.verificationText}>
              Refamora will later support optional seller verification so buyers can see which
              accounts passed a manual review.
            </Text>
            <View style={styles.verificationChecklist}>
              <Text style={styles.verificationChecklistItem}>
                {profileCompletion.isComplete ? 'Done' : 'Pending'} Complete seller profile
              </Text>
              <Text style={styles.verificationChecklistItem}>
                Coming next: submit your account for manual review
              </Text>
              <Text style={styles.verificationChecklistItem}>
                Future badge: visible on listing trust cards after approval
              </Text>
            </View>
            <Pressable onPress={handleVerificationPress} style={styles.verificationAction}>
              <Text style={styles.verificationActionText}>
                {profileCompletion.isComplete ? 'Ready for future review' : 'See requirements'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Change password</Text>
          <View onLayout={registerFieldPosition('password')}>
            <Controller
              control={passwordControl}
              name="password"
              render={({ field: { onChange, value } }) => (
                <FormField
                  ref={passwordRef}
                  label="New password"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Create a new password"
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  error={passwordErrors.password?.message}
                  helperText="At least 6 characters."
                  actionLabel={showPassword ? 'Hide' : 'Show'}
                  onActionPress={() => setShowPassword((current) => !current)}
                />
              )}
            />
          </View>
          <View onLayout={registerFieldPosition('confirmPassword')}>
            <Controller
              control={passwordControl}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <FormField
                  ref={confirmPasswordRef}
                  label="Confirm new password"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Repeat the new password"
                  secureTextEntry={!showConfirmPassword}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleSavePassword()}
                  error={passwordErrors.confirmPassword?.message}
                  actionLabel={showConfirmPassword ? 'Hide' : 'Show'}
                  onActionPress={() => setShowConfirmPassword((current) => !current)}
                />
              )}
            />
          </View>

          <Pressable
            disabled={isOffline || isUpdatingPassword || !canSubmitPassword}
            onPress={() => void handleSavePassword()}
            style={[
              styles.secondaryButton,
              isOffline || isUpdatingPassword || !canSubmitPassword ? styles.buttonDisabled : null,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {isUpdatingPassword ? 'Updating...' : 'Change password'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Log out</Text>
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
    paddingBottom: 32,
  },
  emptyWrapper: {
    flex: 1,
    padding: 24,
  },
  cover: {
    height: 118,
    backgroundColor: '#dcece0',
    overflow: 'hidden',
  },
  coverGlow: {
    position: 'absolute',
    right: -16,
    top: -34,
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(193, 219, 200, 0.65)',
  },
  profileHeader: {
    marginTop: -44,
    paddingHorizontal: 24,
    gap: 12,
    alignItems: 'center',
  },
  avatarWrapper: {
    alignItems: 'center',
    gap: 6,
  },
  avatarPressable: {
    position: 'relative',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: palette.cream,
    backgroundColor: '#e8ebe8',
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: palette.cream,
    backgroundColor: palette.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: palette.cream,
    fontSize: 28,
    fontWeight: '800',
  },
  avatarBadge: {
    position: 'absolute',
    right: 2,
    bottom: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.soil,
    borderWidth: 2,
    borderColor: palette.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeText: {
    color: palette.cream,
    fontSize: 14,
    fontWeight: '800',
  },
  avatarButtonText: {
    color: palette.sageDark,
    fontWeight: '700',
    fontSize: 12,
  },
  identity: {
    alignItems: 'center',
    gap: 3,
  },
  name: {
    color: palette.soil,
    fontSize: 24,
    fontWeight: '800',
  },
  roleLine: {
    color: palette.soil,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  meta: {
    color: palette.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  verifiedBadge: {
    marginTop: 4,
    backgroundColor: '#eef5ef',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  verifiedBadgeText: {
    color: palette.sageDark,
    fontSize: 12,
    fontWeight: '700',
  },
  readyText: {
    marginTop: 2,
    color: palette.sageDark,
    fontSize: 12,
    fontWeight: '700',
  },
  completionCard: {
    width: '100%',
    backgroundColor: '#f7faf7',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 10,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completionTitle: {
    color: palette.soil,
    fontWeight: '700',
    fontSize: 14,
  },
  completionPercent: {
    color: palette.sageDark,
    fontWeight: '800',
    fontSize: 14,
  },
  completionSummary: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: '#e6ece5',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: palette.sage,
  },
  completionList: {
    gap: 10,
  },
  completionCount: {
    color: palette.sageDark,
    fontSize: 12,
    fontWeight: '700',
  },
  completionItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  completionItemStatus: {
    width: 38,
    color: palette.sageDark,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  completionItemText: {
    flex: 1,
    gap: 2,
  },
  completionItemLabel: {
    color: palette.soil,
    fontSize: 13,
    fontWeight: '700',
  },
  completionItemDescription: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  verificationBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  verificationBadgeReady: {
    backgroundColor: '#eef6ed',
  },
  verificationBadgeLocked: {
    backgroundColor: '#f5f0e3',
  },
  verificationBadgeText: {
    color: palette.soil,
    fontSize: 12,
    fontWeight: '800',
  },
  verificationMeta: {
    color: palette.muted,
    fontSize: 12,
  },
  verificationText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  verificationChecklist: {
    gap: 6,
  },
  verificationChecklistItem: {
    color: palette.soil,
    fontSize: 13,
    lineHeight: 18,
  },
  verificationAction: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: palette.parchment,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  verificationActionText: {
    color: palette.clay,
    fontSize: 13,
    fontWeight: '800',
  },
  card: {
    marginTop: 16,
    marginHorizontal: 24,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    gap: 14,
    ...shadow,
  },
  sectionTitle: {
    color: palette.soil,
    fontSize: 18,
    fontWeight: '800',
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: palette.sage,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: palette.cream,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 4,
    backgroundColor: palette.parchment,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: palette.clay,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  offlineText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  logoutButton: {
    backgroundColor: '#f9e4df',
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 14,
  },
  logoutText: {
    color: palette.error,
    fontWeight: '800',
  },
})
