import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native'

import { palette } from '../utils/theme'

type BrandedLoadingScreenProps = {
  message: string
  subtitle?: string
}

export function BrandedLoadingScreen({
  message,
  subtitle,
}: BrandedLoadingScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.logoFrame}>
        <Image source={require('../assets/icon.png')} style={styles.logo} />
      </View>
      <Text style={styles.title}>{message}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <ActivityIndicator
        color={palette.sage}
        size="small"
        style={styles.spinner}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.cream,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoFrame: {
    width: 92,
    height: 92,
    borderRadius: 28,
    backgroundColor: palette.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: palette.sage,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 10,
    overflow: 'hidden',
  },
  logo: {
    width: 74,
    height: 74,
    borderRadius: 20,
  },
  title: {
    color: palette.sageDark,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 320,
  },
  spinner: {
    marginTop: 22,
  },
})
