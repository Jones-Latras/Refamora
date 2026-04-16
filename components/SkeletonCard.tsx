import { StyleSheet, View } from 'react-native'

import { palette, radii } from '../utils/theme'

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.image} />
      <View style={styles.lineShort} />
      <View style={styles.lineLong} />
      <View style={styles.lineMedium} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 12,
  },
  image: {
    height: 120,
    borderRadius: radii.md,
    backgroundColor: '#e7dfcf',
  },
  lineShort: {
    width: '40%',
    height: 12,
    borderRadius: 999,
    backgroundColor: '#e7dfcf',
  },
  lineLong: {
    width: '100%',
    height: 14,
    borderRadius: 999,
    backgroundColor: '#e7dfcf',
  },
  lineMedium: {
    width: '70%',
    height: 12,
    borderRadius: 999,
    backgroundColor: '#e7dfcf',
  },
})
