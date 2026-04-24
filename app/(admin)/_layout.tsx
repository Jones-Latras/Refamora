import { Stack } from 'expo-router'

import { palette } from '../../utils/theme'

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: palette.cream },
        headerTintColor: palette.soil,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        contentStyle: { backgroundColor: palette.cream },
      }}
    >
      <Stack.Screen
        name="dashboard"
        options={{
          title: 'Admin hub',
        }}
      />
      <Stack.Screen
        name="verifications"
        options={{
          title: 'Seller verifications',
        }}
      />
      <Stack.Screen
        name="audit-log"
        options={{
          title: 'Admin audit log',
        }}
      />
      <Stack.Screen
        name="analytics"
        options={{
          title: 'Marketplace analytics',
        }}
      />
      <Stack.Screen
        name="crashes"
        options={{
          title: 'App crash reports',
        }}
      />
    </Stack>
  )
}
