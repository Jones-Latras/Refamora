import { zodResolver } from '@hookform/resolvers/zod'
import { Link, router } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { FormField } from '../../components/FormField'
import { useToast } from '../../components/Toast'
import { signIn } from '../../services/authService'
import { hasSupabaseEnv } from '../../services/supabase'
import type { LoginFormValues } from '../../utils/schemas'
import { loginSchema } from '../../utils/schemas'
import { palette, radii } from '../../utils/theme'

export default function LoginScreen() {
  const { showToast } = useToast()
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

  const onSubmit = handleSubmit(async (values) => {
    const { error } = await signIn(values.email, values.password)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast('Signed in successfully.', 'success')
    router.replace('/')
  })

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Refamora</Text>
            <Text style={styles.title}>Sign in</Text>
          </View>

          {!hasSupabaseEnv ? (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Supabase not connected yet</Text>
              <Text style={styles.noticeText}>
                Copy `SUPABASE_URL` and `SUPABASE_ANON_KEY` into `.env` before
                testing auth.
              </Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <FormField
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  placeholder="farmer@example.com"
                  keyboardType="email-address"
                  error={errors.email?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <FormField
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Your password"
                  secureTextEntry
                  error={errors.password?.message}
                />
              )}
            />

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
            <Link href="/(auth)/signup" style={styles.footerLink}>
              Create one here
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
    padding: 24,
    gap: 22,
  },
  hero: {
    gap: 6,
    paddingTop: 24,
  },
  eyebrow: {
    color: palette.sageDark,
    fontWeight: '700',
    fontSize: 14,
  },
  title: {
    color: palette.soil,
    fontWeight: '800',
    fontSize: 32,
    lineHeight: 38,
  },
  notice: {
    backgroundColor: palette.parchment,
    borderRadius: radii.md,
    padding: 16,
    gap: 6,
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
    marginTop: 8,
    backgroundColor: palette.sage,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: palette.cream,
    fontWeight: '800',
    fontSize: 15,
  },
  footer: {
    flexDirection: 'row',
    gap: 6,
  },
  footerText: {
    color: palette.muted,
  },
  footerLink: {
    color: palette.sageDark,
    fontWeight: '700',
  },
})
