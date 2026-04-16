import { StyleSheet, Text, View } from 'react-native'

import type { FulfillmentType } from '../types/app'

import { palette } from '../utils/theme'

type FulfillmentLabelProps = {
  type: FulfillmentType
}

const LABELS: Record<FulfillmentType, string> = {
  pickup: 'Pickup',
  delivery: 'Delivery',
  both: 'Pickup or Delivery',
}

export function FulfillmentLabel({ type }: FulfillmentLabelProps) {
  return (
    <View style={styles.pill}>
      <Text style={styles.text}>{LABELS[type]}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#efe1c3',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '700',
  },
})
