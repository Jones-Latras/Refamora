import { zodResolver } from '@hookform/resolvers/zod'
import { Link, router, useLocalSearchParams } from 'expo-router'
import { useRef, type RefObject } from 'react'
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

import { FormField } from '../../components/FormField'
import { useToast } from '../../components/Toast'
import { signIn } from '../../services/authService'
import { hasSupabaseEnv } from '../../services/supabase'
import type { LoginFormValues } from '../../utils/schemas'
import { loginSchema } from '../../utils/schemas'
import { palette, radii, shadow } from '../../utils/theme'

export default function LoginScreen() {
  const { showToast } = useToast()
  const params = useLocalSearchParams<{ redirect?: string }>()
  const redirect = typeof params.redirect === 'string' ? params.redirect : '/'
  const scrollViewRef = useRef<ScrollView>(null)
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const fieldPositions = useRef<Record<string, number>>({})
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const registerFieldPosition =
    (fieldName: string) =>
    (event: { nativeEvent: { layout: { y: number } } }) => {
      fieldPositions.current[fieldName] = event.nativeEvent.layout.y
    }

  const focusField = (fieldName: keyof LoginFormValues) => {
    const y = fieldPositions.current[fieldName]

    if (typeof y === 'number') {
      scrollViewRef.current?.scrollTo({ y: Math.max(y - 24, 0), animated: true })
    }

    const refs: Partial<Record<keyof LoginFormValues, RefObject<TextInput | null>>> = {
      email: emailRef,
      password: passwordRef,
    }

    refs[fieldName]?.current?.focus()
  }

  const onSubmit = handleSubmit(
    async (values) => {
      const { error } = await signIn(values.email, values.password)

      if (error) {
        showToast(error.message, 'error')
        return
      }

      showToast('Signed in successfully.', 'success')
      router.replace(redirect)
    },
    (fieldErrors) => {
      const fieldOrder: (keyof LoginFormValues)[] = ['email', 'password']
      const firstErrorField = fieldOrder.find((fieldName) => fieldErrors[fieldName])

      if (firstErrorField) {
        focusField(firstErrorField)
        const message = fieldErrors[firstErrorField]?.message

        if (typeof message === 'string' && message.length > 0) {
          showToast(message, 'error')
          return
        }
      }

      showToast('Please enter your email and password to continue.', 'error')
    },
  )

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.background}>
          <View style={styles.topGlow} />
          <View style={styles.midGlow} />

          <ScrollView
            ref={scrollViewRef}
            bounces={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.main}>
              <View style={styles.brandBlock}>
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.logo}
                />
                <Text style={styles.brand}>Refamora</Text>
                <Text style={styles.brandMeaning}>
                  Where farm waste becomes more valuable.
                </Text>
              </View>

              {!hasSupabaseEnv ? (
                <View style={styles.notice}>
                  <Text style={styles.noticeTitle}>Supabase not connected yet</Text>
                  <Text style={styles.noticeText}>
                    Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env` before
                    testing login.
                  </Text>
                </View>
              ) : null}

              <View style={styles.form}>
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
                        placeholder="farmer@example.com"
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
                        placeholder="Your password"
                        secureTextEntry
                        returnKeyType="done"
                        onSubmitEditing={() => void onSubmit()}
                        error={errors.password?.message}
                      />
                    )}
                  />
                </View>

                <Pressable
                  disabled={isSubmitting}
                  onPress={onSubmit}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Need an account?</Text>
                <Link
                  href={{
                    pathname: '/(auth)/signup',
                    params:
                      redirect !== '/' ? { redirect } : undefined,
                  }}
                  style={styles.footerLink}
                >
                  Create one here
                </Link>
              </View>
            </View>
          </ScrollView>

          <View pointerEvents="none" style={styles.landscape}>
            <View style={[styles.hill, styles.hillBack]} />
            <View style={[styles.hill, styles.hillMiddle]} />
            <View style={[styles.hill, styles.hillFrontLeft]} />
            <View style={[styles.hill, styles.hillFrontRight]} />
            <View style={[styles.field, styles.fieldOne]} />
            <View style={[styles.field, styles.fieldTwo]} />
            <View style={[styles.field, styles.fieldThree]} />
          </View>
        </View>
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
  background: {
    flex: 1,
    backgroundColor: '#f7f8fb',
  },
  topGlow: {
    position: 'absolute',
    top: -120,
    left: -60,
    right: -60,
    height: 260,
    borderRadius: 200,
    backgroundColor: 'rgba(98, 150, 214, 0.10)',
  },
  midGlow: {
    position: 'absolute',
    top: 220,
    left: 40,
    right: 40,
    height: 220,
    borderRadius: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 210,
  },
  main: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
    gap: 18,
  },
  brandBlock: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  logo: {
    width: 88,
    height: 88,
  },
  brand: {
    color: '#214d33',
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  brandMeaning: {
    maxWidth: 320,
    color: '#6c7b74',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  notice: {
    backgroundColor: 'rgba(255, 248, 235, 0.96)',
    borderRadius: radii.md,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(176, 126, 40, 0.16)',
  },
  noticeTitle: {
    color: palette.clay,
    fontWeight: '800',
  },
  noticeText: {
    color: palette.clay,
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: '#2f7d42',
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: 'center',
    ...shadow,
  },
  primaryButtonText: {
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
    color: '#365b45',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  landscape: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 185,
    overflow: 'hidden',
  },
  hill: {
    position: 'absolute',
    bottom: -28,
    borderRadius: 240,
  },
  hillBack: {
    left: -40,
    right: -40,
    height: 120,
    backgroundColor: '#e5eddc',
  },
  hillMiddle: {
    left: 20,
    right: 20,
    bottom: -34,
    height: 110,
    backgroundColor: '#d7e6cd',
  },
  hillFrontLeft: {
    left: -70,
    width: 250,
    bottom: -44,
    height: 120,
    backgroundColor: '#bad28c',
  },
  hillFrontRight: {
    right: -70,
    width: 250,
    bottom: -48,
    height: 126,
    backgroundColor: '#a5c36d',
  },
  field: {
    position: 'absolute',
    bottom: 22,
    borderRadius: 999,
    opacity: 0.95,
  },
  fieldOne: {
    left: -30,
    width: 220,
    height: 72,
    backgroundColor: '#d9e26d',
    transform: [{ rotate: '-8deg' }],
  },
  fieldTwo: {
    left: 120,
    right: 60,
    height: 70,
    backgroundColor: '#cfd95b',
    transform: [{ rotate: '10deg' }],
  },
  fieldThree: {
    right: -20,
    width: 170,
    height: 62,
    backgroundColor: '#b4cc55',
    transform: [{ rotate: '-10deg' }],
  },
})
