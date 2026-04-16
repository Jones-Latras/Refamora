import { Stack, usePathname, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { ToastProvider } from '../components/Toast'
import { AuthProvider, useAuth } from '../hooks/useAuth'
import { palette } from '../utils/theme'

function SplashGate() {
  const { user, role, isLoading } = useAuth()
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

    if (!user) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login')
      }
      return
    }

    if (!role) {
      if (pathname !== '/(auth)/role-select') {
        router.replace('/(auth)/role-select')
      }
      return
    }

    if (inAuthGroup || onRoot) {
      router.replace(
        role === 'farmer' ? '/(farmer)/dashboard' : '/(buyer)/feed',
      )
    }
  }, [isLoading, pathname, role, router, segments, user])

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

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <AuthProvider>
          <SplashGate />
        </AuthProvider>
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
