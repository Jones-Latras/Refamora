import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useConnectivity } from '../hooks/useConnectivity'
import { palette, shadow } from '../utils/theme'

const OFFLINE_BANNER_DURATION_MS = 1000

export function OfflineBanner() {
  const { isOffline, isChecking } = useConnectivity()
  const insets = useSafeAreaInsets()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isChecking || !isOffline) {
      setIsVisible(false)
      return
    }

    setIsVisible(true)

    const timeoutId = setTimeout(() => {
      setIsVisible(false)
    }, OFFLINE_BANNER_DURATION_MS)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [isChecking, isOffline])

  if (isChecking || !isOffline || !isVisible) {
    return null
  }

  return (
    <View pointerEvents="none" style={[styles.viewport, { top: insets.top + 10 }]}>
      <View style={styles.banner}>
        <Text style={styles.title}>You&apos;re offline</Text>
        <Text style={styles.text}>
          Refamora is showing what it can. Reconnect to refresh listings, requests,
          and profile changes.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
  },
  banner: {
    backgroundColor: palette.harvest,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 3,
    ...shadow,
  },
  title: {
    color: palette.cream,
    fontSize: 13,
    fontWeight: '800',
  },
  text: {
    color: palette.cream,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
})
