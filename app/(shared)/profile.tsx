import { useHeaderHeight } from '@react-navigation/elements'
import { zodResolver } from '@hookform/resolvers/zod'
import { router } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'

import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { FormField } from '../../components/FormField'
import { AppImage } from '../../components/AppImage'
import { ProfileScreenSkeleton } from '../../components/ScreenSkeleton'
import { VerifiedBadge } from '../../components/VerifiedBadge'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { useConnectivity } from '../../hooks/useConnectivity'
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications'
import { useProfile } from '../../hooks/useProfile'
import { signOut, updatePassword } from '../../services/authService'
import { updateUserProfile } from '../../services/profileService'
import { getLatestSellerVerificationRequest } from '../../services/sellerVerificationService'
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
  const headerHeight = useHeaderHeight()
  const { user, role } = useAuth()
  const { isOffline } = useConnectivity()
  const { showToast } = useToast()
  const { unreadCount } = useUnreadNotifications()
  const { profile, isLoading, error, refetch } = useProfile(user?.id)
  const scrollViewRef = useRef<ScrollView>(null)
  const fullNameRef = useRef<TextInput>(null)
  const phoneRef = useRef<TextInput>(null)
  const cityRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const confirmPasswordRef = useRef<TextInput>(null)
  const activeFieldRef = useRef<string | null>(null)
  const keyboardHeightRef = useRef(0)
  const scrollOffsetRef = useRef(0)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<
    'pending' | 'approved' | 'rejected' | null
  >(null)
  const keyboardVerticalOffset = Platform.OS === 'ios' ? headerHeight : 0

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
    mode: 'onChange',
    reValidateMode: 'onChange',
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

  useEffect(() => {
    let isMounted = true

    const loadVerificationStatus = async () => {
      if (!user || role !== 'farmer') {
        if (isMounted) {
          setVerificationStatus(null)
        }
        return
      }

      const result = await getLatestSellerVerificationRequest(user.id)

      if (!isMounted) {
        return
      }

      setVerificationStatus(result.data?.status ?? null)
    }

    void loadVerificationStatus()

    return () => {
      isMounted = false
    }
  }, [role, user])

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
  const roleLabel = normalizedRole === 'farmer' ? 'Seller account' : 'Buyer account'
  const profileCompletion = useMemo(
    () => getProfileCompletion(profile, normalizedRole),
    [normalizedRole, profile],
  )
  const passwordStatus = useMemo(() => {
    const passwordValue = watchedPassword.password ?? ''
    const confirmPasswordValue = watchedPassword.confirmPassword ?? ''

    if (!passwordValue && !confirmPasswordValue) {
      return {
        tone: 'neutral' as const,
        message: 'Use at least 6 characters for your new password.',
      }
    }

    if (passwordValue.length > 0 && passwordValue.length < 6) {
      return {
        tone: 'neutral' as const,
        message: 'Password must be at least 6 characters.',
      }
    }

    if (confirmPasswordValue && passwordValue !== confirmPasswordValue) {
      return {
        tone: 'error' as const,
        message: 'Passwords do not match yet.',
      }
    }

    if (passwordValue.length >= 6 && confirmPasswordValue && passwordValue === confirmPasswordValue) {
      return {
        tone: 'success' as const,
        message: 'Passwords match and are ready to update.',
      }
    }

    return {
      tone: 'neutral' as const,
      message: 'Repeat the new password to confirm the change.',
    }
  }, [watchedPassword.confirmPassword, watchedPassword.password])

  const focusCompletionItem = (key: 'full_name' | 'avatar_url' | 'phone' | 'city') => {
    if (key === 'avatar_url') {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true })
      void handlePickAvatar()
      return
    }

    focusField(key)
  }

  const scrollInputIntoView = (
    inputRef: RefObject<TextInput | null>,
    animated = true,
  ) => {
    if (!inputRef.current || !scrollViewRef.current) {
      return
    }

    const keyboardHeight = keyboardHeightRef.current
    const screenHeight = Dimensions.get('window').height
    const visibleBottom =
      screenHeight - keyboardHeight - (Platform.OS === 'ios' ? 28 : 18)

    inputRef.current.measureInWindow((_x, y, _width, height) => {
      const inputTop = y
      const inputBottom = y + height
      const currentOffset = scrollOffsetRef.current

      if (inputBottom > visibleBottom) {
        const delta = inputBottom - visibleBottom

        scrollViewRef.current?.scrollTo({
          y: Math.max(currentOffset + delta, 0),
          animated,
        })
        return
      }

      const desiredTop = Platform.OS === 'ios' ? 128 : 108

      if (inputTop < desiredTop) {
        const delta = desiredTop - inputTop

        scrollViewRef.current?.scrollTo({
          y: Math.max(currentOffset - delta, 0),
          animated,
        })
      }
    })
  }

  const focusField = (fieldName: string) => {
    activeFieldRef.current = fieldName

    const refs: Record<string, RefObject<TextInput | null>> = {
      full_name: fullNameRef,
      phone: phoneRef,
      city: cityRef,
      password: passwordRef,
      confirmPassword: confirmPasswordRef,
    }

    refs[fieldName]?.current?.focus()
    setTimeout(() => {
      scrollInputIntoView(refs[fieldName])
    }, 180)
  }

  useEffect(() => {
    const handleKeyboardVisible = (event: {
      endCoordinates?: { height?: number }
    }) => {
      keyboardHeightRef.current = event.endCoordinates?.height ?? 0
      const activeField = activeFieldRef.current

      if (activeField) {
        const refs: Record<string, RefObject<TextInput | null>> = {
          full_name: fullNameRef,
          phone: phoneRef,
          city: cityRef,
          password: passwordRef,
          confirmPassword: confirmPasswordRef,
        }

        setTimeout(() => {
          scrollInputIntoView(refs[activeField], false)
        }, 60)
      }
    }

    const handleKeyboardHidden = () => {
      keyboardHeightRef.current = 0
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardVisible)
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHidden)

    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [])

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

    router.push('/(shared)/seller-verification')
  }

  const handleNotificationsPress = () => {
    router.push('/(shared)/notifications')
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollViewRef}
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.content}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          onScroll={(event) => {
            scrollOffsetRef.current = event.nativeEvent.contentOffset.y
          }}
          scrollEventThrottle={16}
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
                  <AppImage uri={profile.avatar_url} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>
                      {getInitials(profile.full_name, user?.email ?? 'A')}
                    </Text>
                  </View>
                )}
                <View style={styles.avatarBadge}>
                  <Feather name="camera" size={14} color={palette.cream} />
                </View>
              </Pressable>
              <Text style={styles.avatarHintText}>
                {isOffline
                  ? 'Reconnect to update photo'
                  : isUploadingAvatar
                    ? 'Uploading photo...'
                    : 'Tap photo to edit'}
              </Text>
            </View>

            <View style={styles.identity}>
              <Text style={styles.name}>{profile.full_name ?? 'Refamora user'}</Text>
              <Text style={styles.meta}>{profile.email ?? user?.email ?? 'No email'}</Text>
              <View style={styles.identityChipRow}>
                <View style={styles.identityChip}>
                  <Text style={styles.identityChipText}>{roleLabel}</Text>
                </View>
                {profile?.city ? (
                  <View style={styles.identityChip}>
                    <Text style={styles.identityChipText}>{profile.city}</Text>
                  </View>
                ) : null}
                {profile?.is_verified ? <VerifiedBadge label="Verified seller" /> : null}
                <View
                  style={[
                    styles.identityChip,
                    profileCompletion.isComplete
                      ? styles.identityChipPositive
                      : styles.identityChipMuted,
                  ]}
                >
                  <Text
                    style={[
                      styles.identityChipText,
                      profileCompletion.isComplete ? styles.identityChipTextPositive : null,
                    ]}
                  >
                    {profileCompletion.isComplete
                      ? 'Profile ready'
                      : `${profileCompletion.remainingCount} left`}
                  </Text>
                </View>
              </View>
            </View>

            {!profileCompletion.isComplete ? (
              <View style={styles.completionCard}>
                <View style={styles.completionHeader}>
                  <Text style={styles.completionTitle}>{profileCompletion.title}</Text>
                  <Text style={styles.completionPercent}>{profileCompletion.percent}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[styles.progressFill, { width: `${profileCompletion.percent}%` }]}
                  />
                </View>
                <Text style={styles.completionCount}>
                  {profileCompletion.completedCount} of {profileCompletion.items.length} details
                  complete
                </Text>
                <Text style={styles.completionSummary}>Tap an item to update it faster.</Text>
                <View style={styles.completionList}>
                  {profileCompletion.items.filter((item) => !item.done).map((item) => (
                    <View key={item.key} style={styles.completionItemRow}>
                      <Text style={styles.completionItemLabel}>{item.label}</Text>
                      <Pressable
                        onPress={() => focusCompletionItem(item.key)}
                        style={styles.completionItemActionButton}
                      >
                        <Text style={styles.completionItemAction}>Add</Text>
                      </Pressable>
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
            <View style={styles.sectionHeaderLine}>
              <Feather name="bell" size={18} color={palette.soil} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Notifications</Text>
            </View>
            <Text style={styles.notificationText}>
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'} for marketplace replies, new inquiries, or verification updates.`
                : 'Recent inquiry, reply, and verification updates will appear in your notification center.'}
            </Text>
            <Pressable onPress={handleNotificationsPress} style={styles.notificationAction}>
              <Text style={styles.notificationActionText}>
                {unreadCount > 0 ? `Open notifications (${unreadCount})` : 'Open notifications'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeaderLine}>
              <Feather name="user" size={18} color={palette.soil} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Personal information</Text>
            </View>
          <View>
            <Controller
              control={control}
              name="full_name"
              render={({ field: { onChange, value } }) => (
                <FormField
                  ref={fullNameRef}
                  label="Full name"
                  value={value}
                  onChangeText={onChange}
                  onFocus={() => {
                    activeFieldRef.current = 'full_name'
                    scrollInputIntoView(fullNameRef)
                  }}
                  placeholder="Your full name"
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  error={errors.full_name?.message}
                />
              )}
            />
          </View>
          <View>
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, value } }) => (
                <FormField
                  ref={phoneRef}
                  label="Phone"
                  value={value}
                  onChangeText={onChange}
                  onFocus={() => {
                    activeFieldRef.current = 'phone'
                    scrollInputIntoView(phoneRef)
                  }}
                  placeholder="0917 123 4567"
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => cityRef.current?.focus()}
                  helperText="Use a reachable number."
                  error={errors.phone?.message}
                />
              )}
            />
          </View>
          <View>
            <Controller
              control={control}
              name="city"
              render={({ field: { onChange, value } }) => (
                <FormField
                  ref={cityRef}
                  label="City"
                  value={value}
                  onChangeText={onChange}
                  onFocus={() => {
                    activeFieldRef.current = 'city'
                    scrollInputIntoView(cityRef)
                  }}
                  placeholder="Cagayan de Oro"
                  returnKeyType="done"
                  onSubmitEditing={() => void handleSaveProfile()}
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
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </Text>
          </Pressable>
          {!hasProfileChanges && !isSubmitting ? (
            <Text style={styles.statusText}>Profile is up to date.</Text>
          ) : null}
          </View>

          {normalizedRole === 'farmer' ? (
            <View style={styles.card}>
              <View style={styles.sectionHeaderLine}>
                <Feather name="shield" size={18} color={palette.soil} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Seller verification</Text>
              </View>
            <View style={styles.verificationHeader}>
              <View
                style={[
                  styles.verificationBadge,
                  profile?.is_verified || verificationStatus === 'approved'
                    ? styles.verificationBadgeReady
                    : verificationStatus === 'pending'
                      ? styles.verificationBadgePending
                    : styles.verificationBadgeLocked,
                ]}
              >
                <Text style={styles.verificationBadgeText}>
                  {profile?.is_verified || verificationStatus === 'approved'
                    ? 'Verified'
                    : verificationStatus === 'pending'
                      ? 'Pending review'
                      : verificationStatus === 'rejected'
                        ? 'Needs resubmission'
                        : profileCompletion.isComplete
                          ? 'Ready to submit'
                          : 'Finish profile first'}
                </Text>
              </View>
              <Text style={styles.verificationMeta}>
                {profile?.is_verified || verificationStatus === 'approved'
                  ? 'Approved by Refamora admin review'
                  : verificationStatus === 'pending'
                    ? 'Your request is waiting for admin review'
                    : verificationStatus === 'rejected'
                      ? 'Update your details and resubmit'
                      : 'Manual admin review'}
              </Text>
            </View>
            <Text style={styles.verificationText}>
              {profile?.is_verified || verificationStatus === 'approved'
                ? 'Buyers can now see a verified badge on your seller profile and listings.'
                : 'Submit a proof document so buyers can see that your seller account passed manual review.'}
            </Text>
            <View style={styles.verificationChecklist}>
              <Text style={styles.verificationChecklistItem}>
                {profileCompletion.isComplete ? 'Done' : 'Pending'} Complete seller profile
              </Text>
              <Text style={styles.verificationChecklistItem}>
                {verificationStatus === 'pending'
                  ? 'Current request: waiting for admin review'
                  : verificationStatus === 'rejected'
                    ? 'Next step: resubmit with updated proof'
                    : profile?.is_verified
                      ? 'Current status: approved and visible to buyers'
                      : 'Next step: submit your account for manual review'}
              </Text>
              <Text style={styles.verificationChecklistItem}>
                Buyer trust badge: visible on listing trust cards after approval
              </Text>
            </View>
            <Pressable onPress={handleVerificationPress} style={styles.verificationAction}>
              <Text style={styles.verificationActionText}>
                {profile?.is_verified
                  ? 'Review verification'
                  : verificationStatus === 'pending'
                    ? 'Open request'
                    : verificationStatus === 'rejected'
                      ? 'Resubmit documents'
                      : profileCompletion.isComplete
                        ? 'Start verification'
                        : 'See requirements'}
              </Text>
            </Pressable>
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.sectionHeaderLine}>
              <Feather name="lock" size={18} color={palette.soil} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Change password</Text>
            </View>
          <View>
            <Controller
              control={passwordControl}
              name="password"
              render={({ field: { onChange, value } }) => (
                <FormField
                  ref={passwordRef}
                  label="New password"
                  value={value}
                  onChangeText={onChange}
                  onFocus={() => {
                    activeFieldRef.current = 'password'
                    scrollInputIntoView(passwordRef)
                  }}
                  placeholder="Create a new password"
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  error={passwordErrors.password?.message}
                  helperText="Minimum 6 characters."
                  actionLabel={showPassword ? 'Hide' : 'Show'}
                  onActionPress={() => setShowPassword((current) => !current)}
                />
              )}
            />
          </View>
          <View>
            <Controller
              control={passwordControl}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <FormField
                  ref={confirmPasswordRef}
                  label="Confirm new password"
                  value={value}
                  onChangeText={onChange}
                  onFocus={() => {
                    activeFieldRef.current = 'confirmPassword'
                    scrollInputIntoView(confirmPasswordRef)
                  }}
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
          <Text
            style={[
              styles.passwordStatusText,
              passwordStatus.tone === 'success'
                ? styles.passwordStatusSuccess
                : passwordStatus.tone === 'error'
                  ? styles.passwordStatusError
                  : null,
            ]}
          >
            {passwordStatus.message}
          </Text>

          <Pressable
            disabled={isOffline || isUpdatingPassword || !canSubmitPassword}
            onPress={() => void handleSavePassword()}
            style={[
              styles.secondaryButton,
              isOffline || isUpdatingPassword || !canSubmitPassword ? styles.buttonDisabled : null,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {isUpdatingPassword ? 'Updating...' : 'Update password'}
            </Text>
          </Pressable>
          </View>

          <View style={styles.card}>
            <Pressable onPress={handleLogout} style={styles.logoutButton}>
              <Feather name="log-out" size={18} color={palette.error} style={{ marginRight: 6 }} />
              <Text style={styles.logoutText}>Log out</Text>
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
  flex: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  emptyWrapper: {
    flex: 1,
    padding: 24,
  },
  cover: {
    height: 84,
    backgroundColor: '#dcece0',
    overflow: 'hidden',
  },
  coverGlow: {
    position: 'absolute',
    right: -12,
    top: -26,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(193, 219, 200, 0.65)',
  },
  profileHeader: {
    marginTop: -34,
    paddingHorizontal: 20,
    gap: 10,
    alignItems: 'center',
  },
  avatarWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  avatarPressable: {
    position: 'relative',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: palette.cream,
    backgroundColor: '#e8ebe8',
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: palette.cream,
    backgroundColor: palette.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: palette.cream,
    fontSize: 24,
    fontWeight: '800',
  },
  avatarBadge: {
    position: 'absolute',
    right: 1,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
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
  avatarHintText: {
    color: palette.sageDark,
    fontWeight: '700',
    fontSize: 11,
  },
  identity: {
    alignItems: 'center',
    gap: 4,
  },
  name: {
    color: palette.soil,
    fontSize: 22,
    fontWeight: '800',
  },
  meta: {
    color: palette.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  identityChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  identityChip: {
    backgroundColor: '#f4f7f3',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: palette.border,
  },
  identityChipMuted: {
    backgroundColor: '#f5f3ee',
  },
  identityChipPositive: {
    backgroundColor: '#eef5ef',
    borderColor: 'rgba(58, 102, 72, 0.12)',
  },
  identityChipText: {
    color: palette.clay,
    fontSize: 11,
    fontWeight: '700',
  },
  identityChipTextPositive: {
    color: palette.sageDark,
  },
  completionCard: {
    width: '100%',
    backgroundColor: '#f7faf7',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 8,
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
    fontSize: 12,
    lineHeight: 17,
  },
  progressTrack: {
    width: '100%',
    height: 7,
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
    gap: 8,
  },
  completionCount: {
    color: palette.sageDark,
    fontSize: 12,
    fontWeight: '700',
  },
  completionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  completionItemLabel: {
    flex: 1,
    color: palette.soil,
    fontSize: 13,
    fontWeight: '700',
  },
  completionItemActionButton: {
    borderRadius: 999,
    backgroundColor: '#eef6ed',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  completionItemAction: {
    color: palette.sageDark,
    fontSize: 12,
    fontWeight: '800',
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
  verificationBadgePending: {
    backgroundColor: '#f5ecd6',
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
  notificationText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  notificationAction: {
    alignSelf: 'flex-start',
    marginTop: 2,
    backgroundColor: '#edf4ee',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  notificationActionText: {
    color: palette.sageDark,
    fontSize: 13,
    fontWeight: '800',
  },
  card: {
    marginTop: 14,
    marginHorizontal: 20,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 12,
    ...shadow,
  },
  sectionHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    color: palette.soil,
    fontSize: 17,
    fontWeight: '800',
  },
  primaryButton: {
    marginTop: 2,
    backgroundColor: palette.sage,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: palette.cream,
    fontWeight: '800',
  },
  statusText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  secondaryButton: {
    marginTop: 2,
    backgroundColor: palette.parchment,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 13,
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
  passwordStatusText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  passwordStatusSuccess: {
    color: palette.sageDark,
    fontWeight: '700',
  },
  passwordStatusError: {
    color: palette.error,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: '#f9e4df',
    borderRadius: 999,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
  },
  logoutText: {
    color: palette.error,
    fontWeight: '800',
  },
})
