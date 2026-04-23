import { zodResolver } from '@hookform/resolvers/zod'
import { router } from 'expo-router'
import { useMemo, useRef, useState, type RefObject } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
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

import { EmptyState } from '../../components/EmptyState'
import { FormField } from '../../components/FormField'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { useConnectivity } from '../../hooks/useConnectivity'
import { updatePassword } from '../../services/authService'
import type { PasswordChangeFormValues } from '../../utils/schemas'
import { passwordChangeSchema } from '../../utils/schemas'
import { palette, radii } from '../../utils/theme'

export default function ResetPasswordScreen() {
  const { user, isLoading } = useAuth()
  const { isOffline } = useConnectivity()
  const { showToast } = useToast()
  const scrollViewRef = useRef<ScrollView>(null)
  const passwordRef = useRef<TextInput>(null)
  const confirmPasswordRef = useRef<TextInput>(null)
  const fieldPositions = useRef<Record<string, number>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const watchedValues = watch()

  const registerFieldPosition =
    (fieldName: string) =>
    (event: { nativeEvent: { layout: { y: number } } }) => {
      fieldPositions.current[fieldName] = event.nativeEvent.layout.y
    }

  const focusField = (fieldName: keyof PasswordChangeFormValues) => {
    const y = fieldPositions.current[fieldName]

    if (typeof y === 'number') {
      scrollViewRef.current?.scrollTo({ y: Math.max(y - 24, 0), animated: true })
    }

    const refs: Partial<Record<keyof PasswordChangeFormValues, RefObject<TextInput | null>>> = {
      password: passwordRef,
      confirmPassword: confirmPasswordRef,
    }

    refs[fieldName]?.current?.focus()
  }

  const passwordStatus = useMemo(() => {
    const passwordValue = watchedValues.password ?? ''
    const confirmPasswordValue = watchedValues.confirmPassword ?? ''

    if (!passwordValue && !confirmPasswordValue) {
      return 'Use at least 6 characters for your new password.'
    }

    if (passwordValue.length > 0 && passwordValue.length < 6) {
      return 'Password must be at least 6 characters.'
    }

    if (confirmPasswordValue && passwordValue !== confirmPasswordValue) {
      return 'Passwords do not match yet.'
    }

    if (
      passwordValue.length >= 6 &&
      confirmPasswordValue &&
      passwordValue === confirmPasswordValue
    ) {
      return 'Your new password is ready to save.'
    }

    return 'Repeat the new password to confirm the change.'
  }, [watchedValues.confirmPassword, watchedValues.password])

  const onSubmit = handleSubmit(
    async (values) => {
      if (isOffline) {
        showToast('Reconnect before saving your new password.', 'info')
        return
      }

      const { error } = await updatePassword(values.password)

      if (error) {
        showToast(error.message, 'error')
        return
      }

      reset()
      showToast(
        {
          title: 'Password updated',
          message: 'Your account password has been reset successfully.',
          variant: 'success',
        },
      )
      router.replace('/')
    },
    (fieldErrors) => {
      const fieldOrder: (keyof PasswordChangeFormValues)[] = ['password', 'confirmPassword']
      const firstErrorField = fieldOrder.find((fieldName) => fieldErrors[fieldName])

      if (firstErrorField) {
        focusField(firstErrorField)
        const message = fieldErrors[firstErrorField]?.message

        if (typeof message === 'string' && message.length > 0) {
          showToast(message, 'error')
          return
        }
      }

      showToast('Fix the password fields before saving your new password.', 'error')
    },
  )

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateWrapper}>
          <Text style={styles.loadingText}>Checking your recovery session...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateWrapper}>
          <EmptyState
            title="Reset link not ready"
            description="Open the password reset link from your email on this device so Refamora can verify your recovery session first."
            actionLabel="Request new link"
            onAction={() => router.replace('/(auth)/forgot-password')}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <Text style={styles.title}>Create a new password</Text>
            <Text style={styles.body}>
              Choose a new password for {user.email ?? 'your account'}.
            </Text>
          </View>

          <View style={styles.card}>
            <View onLayout={registerFieldPosition('password')}>
              <Controller
                control={control}
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
                    error={errors.password?.message}
                    helperText="Minimum 6 characters."
                    actionLabel={showPassword ? 'Hide' : 'Show'}
                    onActionPress={() => setShowPassword((current) => !current)}
                  />
                )}
              />
            </View>

            <View onLayout={registerFieldPosition('confirmPassword')}>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, value } }) => (
                  <FormField
                    ref={confirmPasswordRef}
                    label="Confirm new password"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Repeat your new password"
                    secureTextEntry={!showConfirmPassword}
                    returnKeyType="done"
                    onSubmitEditing={() => void onSubmit()}
                    error={errors.confirmPassword?.message}
                    actionLabel={showConfirmPassword ? 'Hide' : 'Show'}
                    onActionPress={() => setShowConfirmPassword((current) => !current)}
                  />
                )}
              />
            </View>

            <Text
              style={[
                styles.statusText,
                passwordStatus === 'Your new password is ready to save.'
                  ? styles.statusSuccess
                  : passwordStatus === 'Passwords do not match yet.'
                    ? styles.statusError
                    : null,
              ]}
            >
              {passwordStatus}
            </Text>

            <Pressable
              disabled={isSubmitting || isOffline || !isDirty}
              onPress={onSubmit}
              style={[
                styles.button,
                isSubmitting || isOffline || !isDirty ? styles.buttonDisabled : null,
              ]}
            >
              <Text style={styles.buttonText}>
                {isSubmitting ? 'Saving password...' : 'Save new password'}
              </Text>
            </Pressable>

            {isOffline ? (
              <Text style={styles.offlineText}>
                Reconnect before saving your new password.
              </Text>
            ) : null}
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
  stateWrapper: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: palette.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    flexGrow: 1,
    padding: 24,
    gap: 20,
    justifyContent: 'center',
  },
  hero: {
    gap: 8,
  },
  title: {
    color: palette.soil,
    fontWeight: '800',
    fontSize: 32,
    lineHeight: 38,
  },
  body: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 20,
    gap: 16,
  },
  statusText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  statusSuccess: {
    color: palette.sageDark,
    fontWeight: '700',
  },
  statusError: {
    color: palette.error,
    fontWeight: '700',
  },
  button: {
    backgroundColor: palette.sage,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: palette.cream,
    fontWeight: '800',
    fontSize: 15,
  },
  offlineText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
})
