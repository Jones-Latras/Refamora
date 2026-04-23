import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { palette } from '../../utils/theme'

export default function AuthCallbackScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={palette.sageDark} />
        <Text style={styles.title}>Finishing sign-in</Text>
        <Text style={styles.body}>
          Please wait while Refamora confirms your email and opens your account.
        </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  title: {
    color: palette.soil,
    fontWeight: '800',
    fontSize: 24,
  },
  body: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 320,
  },
})
