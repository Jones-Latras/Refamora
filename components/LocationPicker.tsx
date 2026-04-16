import * as Location from 'expo-location'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { palette, radii } from '../utils/theme'

type Coordinates = {
  latitude: number | null
  longitude: number | null
}

type LocationPickerProps = {
  value: Coordinates
  onChange: (value: Coordinates) => void
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const handleUseCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()

    if (status !== 'granted') {
      return
    }

    const position = await Location.getCurrentPositionAsync({})

    onChange({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    })
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Pickup location</Text>
      <Text style={styles.meta}>
        {value.latitude != null && value.longitude != null
          ? `${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}`
          : 'No coordinates selected yet.'}
      </Text>
      <Pressable onPress={handleUseCurrentLocation} style={styles.button}>
        <Text style={styles.buttonText}>Use Current Location</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 8,
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
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbe7de',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonText: {
    color: palette.sageDark,
    fontWeight: '700',
  },
})
