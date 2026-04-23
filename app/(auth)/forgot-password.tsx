import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'expo-router'
import { useRef, type RefObject } from 'react'
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

import { FormField } from '../../components/FormField'
import { useToast } from '../../components/Toast'
import { requestPasswordReset } from '../../services/authService'
import type { ForgotPasswordFormValues } from '../../utils/schemas'
import { forgotPasswordSchema } from '../../utils/schemas'
import { palette, radii } from '../../utils/theme'

export default function ForgotPasswordScreen() {
  const { showToast } = useToast()
  const scrollViewRef = useRef<ScrollView>(null)
  const emailRef = useRef<TextInput>(null)
  const fieldPositions = useRef<Record<string, number>>({})
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const registerFieldPosition =
    (fieldName: string) =>
    (event: { nativeEvent: { layout: { y: number } } }) => {
      fieldPositions.current[fieldName] = event.nativeEvent.layout.y
    }

  const focusField = (fieldName: keyof ForgotPasswordFormValues) => {
    const y = fieldPositions.current[fieldName]

    if (typeof y === 'number') {
      scrollViewRef.current?.scrollTo({ y: Math.max(y - 24, 0), animated: true })
    }

    const refs: Partial<Record<keyof ForgotPasswordFormValues, RefObject<TextInput | null>>> = {
      email: emailRef,
    }

    refs[fieldName]?.current?.focus()
  }

  const onSubmit = handleSubmit(
    async (values) => {
      const { error } = await requestPasswordReset(values.email)

      if (error) {
        showToast(error.message, 'error')
        return
      }

      showToast(
        {
          title: 'Reset link sent',
          message: 'Check your email and open the link on this device to create a new password.',
          variant: 'success',
          durationMs: 4200,
        },
      )
    },
    (fieldErrors) => {
      const firstErrorField = fieldErrors.email ? 'email' : null

      if (firstErrorField) {
        focusField(firstErrorField)
        const message = fieldErrors[firstErrorField]?.message

        if (typeof message === 'string' && message.length > 0) {
          showToast(message, 'error')
          return
        }
      }

      showToast('Enter the email address for the account you want to recover.', 'error')
    },
  )

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
            <Text style={styles.title}>Reset your password</Text>
            <Text style={styles.body}>
              Enter your email address and Refamora will send a recovery link.
            </Text>
          </View>

          <View style={styles.card}>
            <View onLayout={registerFieldPosition('email')}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <FormField
                    ref={emailRef}
                    label="Email"
                    value={value}
                    onChangeText={onChange}
                    placeholder="seller@example.com"
                    keyboardType="email-address"
                    returnKeyType="done"
                    onSubmitEditing={() => void onSubmit()}
                    error={errors.email?.message}
                    helperText="Use the same email you used to sign in."
                  />
                )}
              />
            </View>

            <Pressable
              disabled={isSubmitting}
              onPress={onSubmit}
              style={[styles.button, isSubmitting ? styles.buttonDisabled : null]}
            >
              <Text style={styles.buttonText}>
                {isSubmitting ? 'Sending link...' : 'Send reset link'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Remembered your password?</Text>
            <Link href="/(auth)/login" style={styles.footerLink}>
              Back to login
            </Link>
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    color: palette.muted,
  },
  footerLink: {
    color: palette.sageDark,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
})
