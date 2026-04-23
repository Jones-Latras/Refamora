import { Stack } from 'expo-router'

import { palette } from '../../utils/theme'

export default function SharedLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: palette.soil,
        headerStyle: { backgroundColor: palette.cream },
        headerBackTitleVisible: false,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        contentStyle: { backgroundColor: palette.cream },
      }}
    >
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="seller-verification" options={{ title: 'Seller verification' }} />
      <Stack.Screen name="listing/[id]" options={{ title: 'Listing Details' }} />
      <Stack.Screen name="conversation/[id]" options={{ title: 'Conversation' }} />
    </Stack>
  )
}
