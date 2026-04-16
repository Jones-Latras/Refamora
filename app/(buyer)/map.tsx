import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import ClusteredMapView from 'react-native-map-clustering'
import { Marker } from 'react-native-maps'
import { SafeAreaView } from 'react-native-safe-area-context'

import { MapMarker } from '../../components/MapMarker'
import { PinPopup } from '../../components/PinPopup'
import { fetchListingPins, fetchPinDetails } from '../../services/mapService'
import type { ListingDetail, ListingPin } from '../../types/app'
import { palette } from '../../utils/theme'

const INITIAL_REGION = {
  latitude: 8.4542,
  longitude: 124.6319,
  latitudeDelta: 0.45,
  longitudeDelta: 0.45,
}

export default function MapScreen() {
  const [pins, setPins] = useState<ListingPin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedListing, setSelectedListing] = useState<ListingDetail | null>(
    null,
  )
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null)

  useEffect(() => {
    const loadPins = async () => {
      setIsLoading(true)
      const result = await fetchListingPins()
      setPins(result.data ?? [])
      setIsLoading(false)
    }

    void loadPins()
  }, [])

  const handleSelectPin = async (pinId: string) => {
    setSelectedPinId(pinId)
    const result = await fetchPinDetails(pinId)

    if (result.error) {
      setSelectedPinId(null)
      return
    }

    setSelectedListing(result.data)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={palette.sage} size="small" />
            <Text style={styles.loadingText}>Loading map pins...</Text>
          </View>
        ) : (
          <ClusteredMapView
            style={styles.map}
            initialRegion={INITIAL_REGION}
            animationEnabled
            radius={40}
            minPoints={3}
            showsUserLocation
          >
            {pins.map((pin) => (
              <Marker
                key={pin.id}
                coordinate={{
                  latitude: pin.latitude,
                  longitude: pin.longitude,
                }}
                onPress={() => void handleSelectPin(pin.id)}
              >
                <MapMarker wasteType={pin.wasteType} />
              </Marker>
            ))}
          </ClusteredMapView>
        )}

        {selectedPinId && !selectedListing ? (
          <View style={styles.inlineLoader}>
            <ActivityIndicator color={palette.sage} size="small" />
          </View>
        ) : null}

        {selectedListing ? (
          <PinPopup
            listing={selectedListing}
            onClose={() => {
              setSelectedListing(null)
              setSelectedPinId(null)
            }}
            onViewDetails={() => {
              router.push(`/(shared)/listing/${selectedListing.id}`)
            }}
          />
        ) : null}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#dfe8de',
  },
  loadingText: {
    color: palette.sageDark,
    fontWeight: '600',
  },
  inlineLoader: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: palette.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
})
