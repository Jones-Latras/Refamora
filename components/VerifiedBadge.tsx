import { StyleSheet, Text, View } from 'react-native'

import { palette } from '../utils/theme'

type VerifiedBadgeProps = {
  label?: string
}

export function VerifiedBadge({ label = 'Verified seller' }: VerifiedBadgeProps) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#e8f2ea',
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: {
    color: palette.sageDark,
    fontSize: 11,
    fontWeight: '800',
  },
})
