import { StyleSheet, View } from 'react-native'

import { palette } from '../utils/theme'

const wasteTypeColors: Record<string, string> = {
  rice_straw: '#6a8f4e',
  corn_stalks: '#8f6a3d',
  coconut_husk: '#7b563a',
  banana_trunk: '#70543b',
  sugarcane_bagasse: '#b07e28',
  pineapple_leaves: '#7ea04d',
}

export function MapMarker({ wasteType }: { wasteType: string }) {
  return (
    <View
      style={[
        styles.marker,
        {
          backgroundColor: wasteTypeColors[wasteType] ?? palette.sage,
        },
      ]}
    />
  )
}

const styles = StyleSheet.create({
  marker: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: palette.cream,
  },
})
