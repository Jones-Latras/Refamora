import { Stack, usePathname, useRouter, useSegments } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AppErrorBoundary } from '../components/AppErrorBoundary'
import { OfflineBanner } from '../components/OfflineBanner'
import { ToastProvider, useToast } from '../components/Toast'
import { AuthProvider, useAuth } from '../hooks/useAuth'
import { ConnectivityProvider } from '../hooks/useConnectivity'
import { UnreadMessagesProvider } from '../hooks/useUnreadMessages'
import { palette } from '../utils/theme'

function normalizeRedirectPath(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/'
  }

  if (pathname.startsWith('/(auth)')) {
    return '/'
  }

  return pathname
}

function SplashGate() {
  const { user, role, isLoading, notice, clearNotice } = useAuth()
  const { showToast } = useToast()
  const pathname = usePathname()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (isLoading) {
      return
    }

    const currentGroup = segments[0]
    const inAuthGroup = currentGroup === '(auth)'
    const onRoot = pathname === '/'
    const redirectPath = normalizeRedirectPath(pathname)

    if (!user && notice?.type === 'session_expired') {
      showToast({
        title: 'Session expired',
        message:
          redirectPath !== '/'
            ? 'Please sign in again. We kept your place so you can continue where you left off.'
            : notice.message,
        variant: 'info',
        durationMs: 4200,
      })
      clearNotice()
    }

    if (!user) {
      if (!inAuthGroup) {
        router.replace({
          pathname: '/(auth)/login',
          params: redirectPath !== '/' ? { redirect: redirectPath } : undefined,
        })
      }
      return
    }

    if (!role) {
      if (pathname !== '/(auth)/role-select') {
        router.replace({
          pathname: '/(auth)/role-select',
          params: redirectPath !== '/' ? { redirect: redirectPath } : undefined,
        })
      }
      return
    }

    if (inAuthGroup || onRoot) {
      router.replace(
        role === 'farmer' ? '/(farmer)/dashboard' : '/(buyer)/feed',
      )
    }
  }, [clearNotice, isLoading, notice, pathname, role, router, segments, showToast, user])

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <View style={styles.logoContainer}>
          <Feather name="aperture" size={42} color={palette.cream} />
        </View>
        <Text style={styles.brandTitle}>Refamora</Text>
        <Text style={styles.tagline}>Turning Agricultural Waste into Local Wealth.</Text>
        <ActivityIndicator color={palette.sage} size="small" style={{ marginTop: 24 }} />
      </View>
    )
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: styles.content }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(farmer)" />
      <Stack.Screen name="(buyer)" />
      <Stack.Screen name="(shared)" />
    </Stack>
  )
}

function AppChrome() {
  const pathname = usePathname()

  return (
    <AppErrorBoundary resetKey={pathname}>
      <SplashGate />
      <OfflineBanner />
    </AppErrorBoundary>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <ConnectivityProvider>
          <AuthProvider>
            <UnreadMessagesProvider>
              <AppChrome />
            </UnreadMessagesProvider>
          </AuthProvider>
        </ConnectivityProvider>
      </ToastProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: palette.cream,
  },
  splash: {
    flex: 1,
    backgroundColor: palette.cream,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: palette.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: palette.sage,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
    transform: [{ rotate: '-8deg' }],
  },
  brandTitle: {
    color: palette.sageDark,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 12,
  },
  tagline: {
    color: palette.muted,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
})
