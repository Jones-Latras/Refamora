import { zodResolver } from '@hookform/resolvers/zod'
import { router } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useState } from 'react'

import { EmptyState } from '../../components/EmptyState'
import { FormField } from '../../components/FormField'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
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
  const { showToast } = useToast()
  const { profile, isLoading, refetch } = useProfile(user?.id)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
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
    formState: {
      errors: passwordErrors,
      isSubmitting: isUpdatingPassword,
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

  const handlePickAvatar = async () => {
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
      showToast(uploadResult.error?.message ?? 'Unable to upload photo.', 'error')
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
    showToast('Profile photo updated.', 'success')
  }

  const handleSaveProfile = handleSubmit(async (values) => {
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
    showToast('Profile updated successfully.', 'success')
  })

  const handleSavePassword = handlePasswordSubmit(async (values) => {
    const result = await updatePassword(values.password)

    if (result.error) {
      showToast(result.error.message, 'error')
      return
    }

    resetPasswordForm()
    showToast('Password updated successfully.', 'success')
  })

  const handleLogout = async () => {
    await signOut()
    router.replace('/(auth)/login')
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={palette.sage} size="small" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!profile) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.emptyWrapper}>
          <EmptyState
            title="Profile details are empty"
            description="Add your phone number and city to complete your account."
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.cover}>
          <View style={styles.coverGlow} />
        </View>

        <View style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>
                  {getInitials(profile.full_name, user?.email ?? 'A')}
                </Text>
              </View>
            )}
            <Pressable
              disabled={isUploadingAvatar}
              onPress={() => void handlePickAvatar()}
              style={styles.avatarButton}
            >
              <Text style={styles.avatarButtonText}>
                {isUploadingAvatar ? 'Uploading...' : 'Edit photo'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.identity}>
            <Text style={styles.name}>{profile.full_name ?? 'Refamora user'}</Text>
            <Text style={styles.meta}>
              {(role ?? 'buyer').toUpperCase()} · {profile.email ?? user?.email ?? 'No email'}
            </Text>
          </View>

          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personal information</Text>
          <Controller
            control={control}
            name="full_name"
            render={({ field: { onChange, value } }) => (
              <FormField
                label="Full name"
                value={value}
                onChangeText={onChange}
                placeholder="Your full name"
                error={errors.full_name?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <FormField
                label="Phone"
                value={value}
                onChangeText={onChange}
                placeholder="0917 123 4567"
                keyboardType="phone-pad"
                error={errors.phone?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="city"
            render={({ field: { onChange, value } }) => (
              <FormField
                label="City"
                value={value}
                onChangeText={onChange}
                placeholder="Cagayan de Oro"
                error={errors.city?.message}
              />
            )}
          />

          <Pressable
            disabled={isSubmitting}
            onPress={() => void handleSaveProfile()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Security</Text>
          <Controller
            control={passwordControl}
            name="password"
            render={({ field: { onChange, value } }) => (
              <FormField
                label="New password"
                value={value}
                onChangeText={onChange}
                placeholder="Create a new password"
                secureTextEntry
                error={passwordErrors.password?.message}
              />
            )}
          />
          <Controller
            control={passwordControl}
            name="confirmPassword"
            render={({ field: { onChange, value } }) => (
              <FormField
                label="Confirm new password"
                value={value}
                onChangeText={onChange}
                placeholder="Repeat the new password"
                secureTextEntry
                error={passwordErrors.confirmPassword?.message}
              />
            )}
          />

          <Pressable
            disabled={isUpdatingPassword}
            onPress={() => void handleSavePassword()}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              {isUpdatingPassword ? 'Updating...' : 'Change password'}
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
    paddingBottom: 32,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: palette.muted,
    fontWeight: '600',
  },
  emptyWrapper: {
    flex: 1,
    padding: 24,
  },
  cover: {
    height: 170,
    backgroundColor: '#dcece0',
    overflow: 'hidden',
  },
  coverGlow: {
    position: 'absolute',
    right: -30,
    top: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#c1dbc8',
  },
  profileHeader: {
    marginTop: -54,
    paddingHorizontal: 24,
    gap: 14,
    alignItems: 'center',
  },
  avatarWrapper: {
    alignItems: 'center',
    gap: 10,
  },
  avatarImage: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 4,
    borderColor: palette.cream,
    backgroundColor: '#e8ebe8',
  },
  avatarFallback: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 4,
    borderColor: palette.cream,
    backgroundColor: palette.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: palette.cream,
    fontSize: 34,
    fontWeight: '800',
  },
  avatarButton: {
    backgroundColor: palette.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  avatarButtonText: {
    color: palette.sageDark,
    fontWeight: '700',
    fontSize: 13,
  },
  identity: {
    alignItems: 'center',
    gap: 4,
  },
  name: {
    color: palette.soil,
    fontSize: 28,
    fontWeight: '800',
  },
  meta: {
    color: palette.muted,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: palette.parchment,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  logoutText: {
    color: palette.clay,
    fontWeight: '800',
  },
  card: {
    marginTop: 20,
    marginHorizontal: 24,
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 20,
    gap: 16,
    ...shadow,
  },
  sectionTitle: {
    color: palette.soil,
    fontSize: 20,
    fontWeight: '800',
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: palette.sage,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 15,
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
    paddingVertical: 15,
  },
  secondaryButtonText: {
    color: palette.clay,
    fontWeight: '800',
  },
})
