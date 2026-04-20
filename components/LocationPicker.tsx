import * as Location from 'expo-location'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import MapView, { Marker, type MapPressEvent, type Region } from 'react-native-maps'

import { palette, radii } from '../utils/theme'

type Coordinates = {
  latitude: number | null
  longitude: number | null
}

type ResolvedAddress = {
  address: string
  city: string
}

type LocationPickerProps = {
  value: Coordinates
  onChange: (value: Coordinates) => void
  onResolvedAddress?: (value: ResolvedAddress) => void
}

const DEFAULT_REGION: Region = {
  latitude: 8.4542,
  longitude: 124.6319,
  latitudeDelta: 0.45,
  longitudeDelta: 0.45,
}

export function LocationPicker({
  value,
  onChange,
  onResolvedAddress,
}: LocationPickerProps) {
  const [region, setRegion] = useState<Region>(DEFAULT_REGION)
  const [resolvedLabel, setResolvedLabel] = useState('Tap the map to place a pin.')
  const [isResolving, setIsResolving] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  useEffect(() => {
    if (value.latitude == null || value.longitude == null) {
      return
    }

    setRegion((current) => ({
      ...current,
      latitude: value.latitude ?? current.latitude,
      longitude: value.longitude ?? current.longitude,
    }))
  }, [value.latitude, value.longitude])

  const resolveAddress = async (latitude: number, longitude: number) => {
    setLocationError(null)
    setIsResolving(true)

    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude })
      const place = places[0]

      if (!place) {
        setResolvedLabel('Pinned location selected. Enter the address manually if needed.')
        return
      }

      const addressParts = [
        place.name,
        place.street,
        place.district,
        place.subregion,
      ].filter(Boolean)
      const city =
        place.city ?? place.subregion ?? place.region ?? 'Unknown location'
      const address = addressParts.join(', ')

      setResolvedLabel(address ? `${address}, ${city}` : city)
      onResolvedAddress?.({
        address: address || city,
        city,
      })
    } catch (error) {
      console.warn('Reverse geocoding is unavailable for the selected coordinates.', error)
      setResolvedLabel('Coordinates selected. Enter the pickup address manually.')
      setLocationError(
        'Address lookup is unavailable right now. You can keep the map pin and type the address manually.',
      )
    } finally {
      setIsResolving(false)
    }
  }

  const applyCoordinates = async (latitude: number, longitude: number) => {
    onChange({ latitude, longitude })
    await resolveAddress(latitude, longitude)
  }

  const handleMapPress = async (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate
    await applyCoordinates(latitude, longitude)
  }

  const handleUseCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== 'granted') {
        setLocationError('Location permission is required to use your current position.')
        return
      }

      setLocationError(null)

      const position = await Location.getCurrentPositionAsync({})

      const nextRegion = {
        ...region,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }

      setRegion(nextRegion)
      await applyCoordinates(position.coords.latitude, position.coords.longitude)
    } catch (error) {
      console.warn('Unable to read the current device location.', error)
      setLocationError(
        'Unable to get your current location right now. You can place the pin manually on the map.',
      )
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Pickup location</Text>
          <Text style={styles.meta}>
            Tap the map to drop a pin or use your current location.
          </Text>
        </View>
        <Pressable onPress={handleUseCurrentLocation} style={styles.button}>
          <Text style={styles.buttonText}>Use Current Location</Text>
        </Pressable>
      </View>

      <MapView
        style={styles.map}
        initialRegion={region}
        region={region}
        onRegionChangeComplete={setRegion}
        onPress={handleMapPress}
      >
        {value.latitude != null && value.longitude != null ? (
          <Marker
            coordinate={{
              latitude: value.latitude,
              longitude: value.longitude,
            }}
          />
        ) : null}
      </MapView>

      <View style={styles.details}>
        <Text style={styles.detailLabel}>Coordinates</Text>
        <Text style={styles.detailText}>
          {value.latitude != null && value.longitude != null
            ? `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`
            : 'No coordinates selected yet.'}
        </Text>
        <Text style={styles.detailLabel}>Resolved address</Text>
        <Text style={styles.detailText}>
          {isResolving ? 'Resolving address...' : resolvedLabel}
        </Text>
        {locationError ? (
          <Text style={styles.errorText}>{locationError}</Text>
        ) : null}
      </View>
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
    gap: 12,
  },
  header: {
    gap: 12,
  },
  headerText: {
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
    lineHeight: 20,
  },
  map: {
    height: 220,
    borderRadius: radii.md,
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
  details: {
    gap: 4,
  },
  detailLabel: {
    color: palette.soil,
    fontWeight: '700',
    fontSize: 13,
  },
  detailText: {
    color: palette.muted,
    lineHeight: 20,
  },
  errorText: {
    color: palette.error,
    fontSize: 12,
    marginTop: 4,
  },
})
