import { StyleSheet, Text, View } from 'react-native'

import { palette } from '../utils/theme'

export function MapMarker({ label }: { label: string }) {
  return (
    <View style={styles.marker}>
      <Text numberOfLines={1} style={styles.text}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  marker: {
    backgroundColor: palette.sage,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 140,
  },
  text: {
    color: palette.cream,
    fontSize: 11,
    fontWeight: '700',
  },
})
