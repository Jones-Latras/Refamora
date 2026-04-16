import { router, Stack } from 'expo-router'
import { Pressable, Text } from 'react-native'

import { palette } from '../../utils/theme'

export default function FarmerLayout() {
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
      <Stack.Screen name="dashboard" options={{ title: 'Farmer Dashboard' }} />
      <Stack.Screen name="my-listings" options={{ title: 'My Listings' }} />
      <Stack.Screen name="create-listing" options={{ title: 'Create Listing' }} />
      <Stack.Screen name="edit-listing/[id]" options={{ title: 'Edit Listing' }} />
    </Stack>
  )
}
