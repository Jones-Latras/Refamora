import { router, useLocalSearchParams } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { palette, radii } from '../../utils/theme'

export default function ConfirmEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>()
  const email = typeof params.email === 'string' ? params.email.trim() : ''

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Confirm your email first</Text>
          <Text style={styles.body}>
            We sent a confirmation link to {email || 'your email address'}.
            Open that email and tap the link before choosing your account type.
          </Text>
          <Text style={styles.note}>
            After confirmation, the app will open and take you to account type selection.
          </Text>
        </View>

        <Pressable
          onPress={() => router.replace('/(auth)/login')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Back to login</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 18,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 22,
    gap: 10,
  },
  title: {
    color: palette.soil,
    fontWeight: '800',
    fontSize: 28,
    lineHeight: 34,
  },
  body: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  note: {
    color: palette.sageDark,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  button: {
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
