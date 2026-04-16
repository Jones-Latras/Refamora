import { StyleSheet, Text, View } from 'react-native'

import type { ListingPin } from '../types/app'

import { palette, radii } from '../utils/theme'

export function PinPopup({ pin }: { pin: ListingPin }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{pin.title}</Text>
      <Text style={styles.meta}>{pin.wasteType}</Text>
      <Text style={styles.meta}>
        {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.soil,
  },
  meta: {
    fontSize: 13,
    color: palette.muted,
  },
})
