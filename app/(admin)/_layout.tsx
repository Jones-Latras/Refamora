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
          title: 'Admin moderation',
        }}
      />
      <Stack.Screen
        name="verifications"
        options={{
          title: 'Seller verifications',
        }}
      />
    </Stack>
  )
}
