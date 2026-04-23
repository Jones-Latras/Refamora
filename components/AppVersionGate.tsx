import * as Linking from 'expo-linking'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import { getActiveAppRuntimePolicy, getCurrentAppVersion } from '../services/appRuntimePolicyService'
import type { AppRuntimePolicy } from '../types/app'
import { isVersionBelowMinimum } from '../utils/appVersion'
import { palette, radii, shadow } from '../utils/theme'
import { BrandedLoadingScreen } from './BrandedLoadingScreen'

type AppVersionGateProps = {
  children: ReactNode
}

function getUpdateUrl(policy: AppRuntimePolicy | null) {
  if (!policy) {
    return null
  }

  if (Platform.OS === 'ios') {
    return policy.iosStoreUrl
  }

  if (Platform.OS === 'android') {
    return policy.androidStoreUrl
  }

  return policy.androidStoreUrl ?? policy.iosStoreUrl
}

export function AppVersionGate({ children }: AppVersionGateProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [policy, setPolicy] = useState<AppRuntimePolicy | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadPolicy = async () => {
      const result = await getActiveAppRuntimePolicy()

      if (!isMounted) {
        return
      }

      setPolicy(result.data ?? null)
      setIsLoading(false)
    }

    void loadPolicy()

    return () => {
      isMounted = false
    }
  }, [])

  const currentVersion = getCurrentAppVersion()
  const requiresUpdate = useMemo(() => {
    if (!policy || !policy.isEnforced) {
      return false
    }

    return isVersionBelowMinimum(currentVersion, policy.minimumSupportedVersion)
  }, [currentVersion, policy])

  if (isLoading) {
    return (
      <BrandedLoadingScreen
        message="Checking app version"
        subtitle="Confirming this build is still supported before loading Refamora."
      />
    )
  }

  if (!requiresUpdate) {
    return <>{children}</>
  }

  const updateUrl = getUpdateUrl(policy)

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.kicker}>Update required</Text>
        <Text style={styles.title}>This Refamora build is no longer supported.</Text>
        <Text style={styles.description}>
          {policy?.updateMessage ??
            'Install the latest supported version before continuing to sign in or use the marketplace.'}
        </Text>
        <Text style={styles.metaText}>
          Current version: {currentVersion || 'unknown'} | Minimum supported version:{' '}
          {policy?.minimumSupportedVersion ?? 'unknown'}
        </Text>

        {updateUrl ? (
          <Pressable
            onPress={() => {
              void Linking.openURL(updateUrl)
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Open update link</Text>
          </Pressable>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              No platform update link is configured yet. Contact the Refamora admin to get the latest build.
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.cream,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 24,
    gap: 12,
    ...shadow,
  },
  kicker: {
    color: palette.error,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    color: palette.soil,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  description: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  metaText: {
    color: palette.clay,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: palette.sage,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: palette.cream,
    fontSize: 14,
    fontWeight: '800',
  },
  infoCard: {
    marginTop: 4,
    backgroundColor: '#f9e4df',
    borderRadius: radii.md,
    padding: 14,
  },
  infoText: {
    color: palette.error,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
})
