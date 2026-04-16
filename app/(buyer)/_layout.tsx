import { Stack } from 'expo-router'

import { palette } from '../../utils/theme'

export default function BuyerLayout() {
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
      <Stack.Screen name="feed" options={{ title: 'Buyer Feed' }} />
      <Stack.Screen name="map" options={{ title: 'Map View' }} />
      <Stack.Screen name="dashboard" options={{ title: 'Buyer Dashboard' }} />
      <Stack.Screen name="requests" options={{ title: 'Sent Requests' }} />
    </Stack>
  )
}
