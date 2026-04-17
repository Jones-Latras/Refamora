import { Stack, usePathname, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { OfflineBanner } from '../components/OfflineBanner'
import { ToastProvider, useToast } from '../components/Toast'
import { AuthProvider, useAuth } from '../hooks/useAuth'
import { ConnectivityProvider } from '../hooks/useConnectivity'
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
        <Text style={styles.eyebrow}>Refamora</Text>
        <Text style={styles.title}>Linking farmers and buyers</Text>
        <ActivityIndicator color={palette.harvest} size="small" />
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
  return (
    <>
      <SplashGate />
      <OfflineBanner />
    </>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <ConnectivityProvider>
          <AuthProvider>
            <AppChrome />
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
    backgroundColor: palette.soil,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  eyebrow: {
    color: palette.harvest,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: {
    color: palette.cream,
    fontSize: 28,
    textAlign: 'center',
    fontWeight: '700',
  },
})
