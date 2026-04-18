import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import ClusteredMapView from 'react-native-map-clustering'
import { Marker } from 'react-native-maps'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { MapMarker } from '../../components/MapMarker'
import { PinPopup } from '../../components/PinPopup'
import { useToast } from '../../components/Toast'
import { useBuyerLocationStore } from '../../hooks/useBuyerLocation'
import { useConnectivity } from '../../hooks/useConnectivity'
import { requestCurrentCoordinates } from '../../services/locationService'
import { fetchListingPins, fetchPinDetails } from '../../services/mapService'
import type { ListingDetail, ListingPin } from '../../types/app'
import { formatDistanceAway, getDistanceKm } from '../../utils/location'
import { palette } from '../../utils/theme'

const INITIAL_REGION = {
  latitude: 8.4542,
  longitude: 124.6319,
  latitudeDelta: 0.45,
  longitudeDelta: 0.45,
}

export default function MapScreen() {
  const { showToast } = useToast()
  const { isOffline } = useConnectivity()
  const buyerCoordinates = useBuyerLocationStore((state) => state.coordinates)
  const setBuyerCoordinates = useBuyerLocationStore((state) => state.setCoordinates)
  const [pins, setPins] = useState<ListingPin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLocationLoading, setIsLocationLoading] = useState(false)
  const [selectedListing, setSelectedListing] = useState<ListingDetail | null>(
    null,
  )
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null)
  const [mapRegion, setMapRegion] = useState(INITIAL_REGION)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadPins = async () => {
    setIsLoading(true)
    setLoadError(null)
    const result = await fetchListingPins()

    if (result.error) {
      setPins([])
      setLoadError(result.error.message)
      setIsLoading(false)
      return
    }

    setPins(result.data ?? [])
    setIsLoading(false)
  }

  useEffect(() => {
    void loadPins()
  }, [])

  useEffect(() => {
    if (!buyerCoordinates) {
      return
    }

    setMapRegion({
      latitude: buyerCoordinates.latitude,
      longitude: buyerCoordinates.longitude,
      latitudeDelta: 0.18,
      longitudeDelta: 0.18,
    })
  }, [buyerCoordinates])

  const handleSelectPin = async (pinId: string) => {
    if (isOffline) {
      showToast('Reconnect to load listing previews from the map.', 'info')
      return
    }

    setSelectedPinId(pinId)
    const result = await fetchPinDetails(pinId)

    if (result.error) {
      setSelectedPinId(null)
      return
    }

    setSelectedListing(result.data)
  }

  const handleUseMyLocation = async () => {
    setIsLocationLoading(true)

    const result = await requestCurrentCoordinates()

    setIsLocationLoading(false)

    if (result.error || !result.data) {
      showToast(
        result.error?.message ?? 'Unable to get your current location right now.',
        'error',
      )
      return
    }

    setBuyerCoordinates(result.data)
    showToast('Map centered near you.', 'success')
  }

  const nearbyPinCount = useMemo(() => {
    if (!buyerCoordinates) {
      return 0
    }

    return pins.filter((pin) => {
      const distanceKm = getDistanceKm(buyerCoordinates, {
        latitude: pin.latitude,
        longitude: pin.longitude,
      })

      return distanceKm <= 15
    }).length
  }, [buyerCoordinates, pins])

  const selectedDistanceLabel = useMemo(() => {
    if (
      !buyerCoordinates ||
      !selectedListing ||
      selectedListing.latitude == null ||
      selectedListing.longitude == null
    ) {
      return null
    }

    return formatDistanceAway(
      getDistanceKm(buyerCoordinates, {
        latitude: selectedListing.latitude,
        longitude: selectedListing.longitude,
      }),
      buyerCoordinates.accuracyMeters,
    )
  }, [buyerCoordinates, selectedListing])

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topOverlay}>
          <View style={styles.toggleCard}>
            <View style={styles.viewToggle}>
              <Pressable
                onPress={() => router.push('/(buyer)/feed')}
                style={styles.viewToggleOption}
              >
                <Text style={styles.viewToggleText}>List</Text>
              </Pressable>
              <Pressable
                style={[styles.viewToggleOption, styles.viewToggleOptionActive]}
              >
                <Text style={[styles.viewToggleText, styles.viewToggleTextActive]}>
                  Map
                </Text>
              </Pressable>
            </View>
            <View style={styles.locationRow}>
              <Pressable
                onPress={() => void handleUseMyLocation()}
                style={[
                  styles.locationButton,
                  buyerCoordinates ? styles.locationButtonActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.locationButtonText,
                    buyerCoordinates ? styles.locationButtonTextActive : null,
                  ]}
                >
                  {isLocationLoading
                    ? 'Getting your location...'
                    : buyerCoordinates
                      ? 'Recenter near me'
                      : 'Use my location'}
                </Text>
              </Pressable>
              {buyerCoordinates ? (
                <Text style={styles.locationMeta}>
                  {nearbyPinCount} nearby pin{nearbyPinCount === 1 ? '' : 's'} within 15 km
                </Text>
              ) : null}
            </View>
            <Text style={styles.toggleHelper}>
              {buyerCoordinates
                ? 'Tap a pin to preview a listing, compare distance, then open full details.'
                : 'Tap a pin to preview a listing, then open full details.'}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={palette.sage} size="small" />
            <Text style={styles.loadingText}>Loading map pins...</Text>
          </View>
        ) : loadError && pins.length === 0 ? (
          <View style={styles.emptyWrapper}>
            <ErrorState
              title="Map pins could not be loaded"
              description="Refamora could not load listing pins right now. Try again to refresh the map."
              onAction={() => {
                void loadPins()
              }}
            />
          </View>
        ) : isOffline && pins.length === 0 ? (
          <View style={styles.emptyWrapper}>
            <EmptyState
              title="Map is unavailable offline"
              description="Reconnect to load listing pins and preview sellers around you."
              actionLabel="Browse list view"
              onAction={() => router.push('/(buyer)/feed')}
            />
          </View>
        ) : (
          <ClusteredMapView
            style={styles.map}
            region={mapRegion}
            onRegionChangeComplete={setMapRegion}
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
            distanceLabel={selectedDistanceLabel}
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
  topOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  toggleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    gap: 10,
  },
  viewToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: palette.parchment,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  viewToggleOption: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  viewToggleOptionActive: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  viewToggleText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  viewToggleTextActive: {
    color: palette.soil,
  },
  toggleHelper: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  locationButton: {
    alignSelf: 'flex-start',
    backgroundColor: palette.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  locationButtonActive: {
    backgroundColor: '#e4efe6',
    borderColor: 'rgba(58, 102, 72, 0.18)',
  },
  locationButtonText: {
    color: palette.clay,
    fontWeight: '800',
    fontSize: 13,
  },
  locationButtonTextActive: {
    color: palette.sageDark,
  },
  locationMeta: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
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
  emptyWrapper: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
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
