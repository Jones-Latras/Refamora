import { zodResolver } from '@hookform/resolvers/zod'
import { router } from 'expo-router'
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
import { signUp } from '../../services/authService'
import type { SignUpFormValues } from '../../utils/schemas'
import { signUpSchema } from '../../utils/schemas'
import { palette } from '../../utils/theme'

export default function SignUpScreen() {
  const { showToast } = useToast()
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

  const onSubmit = handleSubmit(async (values) => {
    const { user, error } = await signUp(values.email, values.password, {
      full_name: values.fullName,
      phone: values.phone,
    })

    if (error || !user) {
      showToast(error?.message ?? 'Unable to create account.', 'error')
      return
    }

    showToast('Account created. Pick your role next.', 'success')
    router.replace('/(auth)/role-select')
  })

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.title}>Create your AgriWaste account</Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, value } }) => (
                <FormField
                  label="Full name"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Maria Santos"
                  error={errors.fullName?.message}
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
              name="email"
              render={({ field: { onChange, value } }) => (
                <FormField
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  placeholder="maria@example.com"
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
                  placeholder="Create a password"
                  secureTextEntry
                  error={errors.password?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <FormField
                  label="Confirm password"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Repeat your password"
                  secureTextEntry
                  error={errors.confirmPassword?.message}
                />
              )}
            />

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
