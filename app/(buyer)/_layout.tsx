import { router, Stack } from 'expo-router'
import { Pressable, Text } from 'react-native'

import { palette } from '../../utils/theme'

export default function BuyerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: palette.soil,
        headerStyle: { backgroundColor: palette.cream },
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: palette.cream },
        headerRight: () => (
          <Pressable onPress={() => router.push('/(shared)/profile')}>
            <Text
              style={{
                color: palette.sageDark,
                fontWeight: '800',
              }}
            >
              Profile
            </Text>
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="feed" options={{ title: 'Buyer Feed' }} />
      <Stack.Screen name="map" options={{ title: 'Map View' }} />
      <Stack.Screen name="dashboard" options={{ title: 'Buyer Dashboard' }} />
      <Stack.Screen name="requests" options={{ title: 'Sent Requests' }} />
    </Stack>
  )
}
