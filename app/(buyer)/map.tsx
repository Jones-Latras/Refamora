import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { MapMarker } from '../../components/MapMarker'
import { PinPopup } from '../../components/PinPopup'
import { fetchListingPins } from '../../services/mapService'
import type { ListingPin } from '../../types/app'
import { palette, radii } from '../../utils/theme'

export default function MapScreen() {
  const [pins, setPins] = useState<ListingPin[]>([])

  useEffect(() => {
    const loadPins = async () => {
      const result = await fetchListingPins()
      setPins(result.data ?? [])
    }

    void loadPins()
  }, [])

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>Map layer foundation</Text>
          <Text style={styles.subtitle}>
            The data contract for map pins is in place. A clustered map view can
            replace this canvas once the map dependencies are installed and
            configured.
          </Text>
        </View>

        <View style={styles.mapCanvas}>
          {pins.length > 0 ? (
            pins.slice(0, 6).map((pin) => <MapMarker key={pin.id} label={pin.title} />)
          ) : (
            <Text style={styles.helper}>No active pins yet.</Text>
          )}
        </View>

        <View style={styles.popupList}>
          {pins.slice(0, 5).map((pin) => (
            <PinPopup key={pin.id} pin={pin} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  content: {
    padding: 24,
    gap: 18,
  },
  hero: {
    gap: 8,
  },
  title: {
    color: palette.soil,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.muted,
    lineHeight: 22,
  },
  mapCanvas: {
    minHeight: 240,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#dfe8de',
    padding: 18,
    gap: 10,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  helper: {
    color: palette.sageDark,
  },
  popupList: {
    gap: 12,
  },
})
