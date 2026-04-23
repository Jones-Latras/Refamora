import { zodResolver } from '@hookform/resolvers/zod'
import { router, useLocalSearchParams } from 'expo-router'
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
import { signUp } from '../../services/authService'
import type { SignUpFormValues } from '../../utils/schemas'
import { signUpSchema } from '../../utils/schemas'
import { palette } from '../../utils/theme'

export default function SignUpScreen() {
  const { showToast } = useToast()
  const params = useLocalSearchParams<{ redirect?: string }>()
  const redirect = typeof params.redirect === 'string' ? params.redirect : '/'
  const scrollViewRef = useRef<ScrollView>(null)
  const fullNameRef = useRef<TextInput>(null)
  const phoneRef = useRef<TextInput>(null)
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const confirmPasswordRef = useRef<TextInput>(null)
  const fieldPositions = useRef<Record<string, number>>({})
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      phone: '',
    },
  })

  const registerFieldPosition =
    (fieldName: string) =>
    (event: { nativeEvent: { layout: { y: number } } }) => {
      fieldPositions.current[fieldName] = event.nativeEvent.layout.y
    }

  const focusField = (fieldName: keyof SignUpFormValues) => {
    const y = fieldPositions.current[fieldName]

    if (typeof y === 'number') {
      scrollViewRef.current?.scrollTo({ y: Math.max(y - 24, 0), animated: true })
    }

    const refs: Partial<Record<keyof SignUpFormValues, RefObject<TextInput | null>>> = {
      fullName: fullNameRef,
      phone: phoneRef,
      email: emailRef,
      password: passwordRef,
      confirmPassword: confirmPasswordRef,
    }

    refs[fieldName]?.current?.focus()
  }

  const onSubmit = handleSubmit(
    async (values) => {
      const { user, error } = await signUp(values.email, values.password, {
        full_name: values.fullName,
        phone: values.phone,
      })

      if (error || !user) {
        showToast(error?.message ?? 'Unable to create account.', 'error')
        return
      }

      showToast('Account created. Check your email to confirm first.', 'success')
      router.replace({
        pathname: '/(auth)/confirm-email',
        params: {
          ...(redirect !== '/' ? { redirect } : undefined),
          email: values.email,
        },
      })
    },
    (fieldErrors) => {
      const fieldOrder: (keyof SignUpFormValues)[] = [
        'fullName',
        'phone',
        'email',
        'password',
        'confirmPassword',
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

      showToast('Please complete the required fields before creating your account.', 'error')
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
            <Text style={styles.title}>Create your Refamora account</Text>
          </View>

          <View style={styles.form}>
            <View onLayout={registerFieldPosition('fullName')}>
              <Controller
                control={control}
                name="fullName"
                render={({ field: { onChange, value } }) => (
                  <FormField
                    ref={fullNameRef}
                    label="Full name"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Maria Santos"
                    returnKeyType="next"
                    onSubmitEditing={() => phoneRef.current?.focus()}
                    error={errors.fullName?.message}
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
                    onSubmitEditing={() => emailRef.current?.focus()}
                    helperText="Use an active mobile number like 09171234567."
                    error={errors.phone?.message}
                  />
                )}
              />
            </View>
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
                    placeholder="maria@example.com"
                    keyboardType="email-address"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    error={errors.email?.message}
                  />
                )}
              />
            </View>
            <View onLayout={registerFieldPosition('password')}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <FormField
                    ref={passwordRef}
                    label="Password"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Create a password"
                    secureTextEntry
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    error={errors.password?.message}
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
                    label="Confirm password"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Repeat your password"
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={() => void onSubmit()}
                    error={errors.confirmPassword?.message}
                  />
                )}
              />
            </View>

            <Pressable
              disabled={isSubmitting}
              onPress={onSubmit}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {isSubmitting ? 'Creating account...' : 'Create Account'}
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
  flex: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 22,
  },
  hero: {
    gap: 6,
    paddingTop: 24,
  },
  title: {
    color: palette.soil,
    fontWeight: '800',
    fontSize: 32,
    lineHeight: 38,
  },
  form: {
    gap: 16,
  },
  button: {
    marginTop: 8,
    alignItems: 'center',
    backgroundColor: palette.sage,
    borderRadius: 999,
    paddingVertical: 16,
  },
  buttonText: {
    color: palette.cream,
    fontWeight: '800',
    fontSize: 15,
  },
})
