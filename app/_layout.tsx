import 'react-native-gesture-handler'

import { Stack, usePathname, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AppErrorBoundary } from '../components/AppErrorBoundary'
import { BrandedLoadingScreen } from '../components/BrandedLoadingScreen'
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
      <BrandedLoadingScreen
        message="Refamora"
        subtitle="Turning Agricultural Waste into Local Wealth."
      />
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
})
