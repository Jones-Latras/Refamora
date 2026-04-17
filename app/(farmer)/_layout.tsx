import { Stack } from 'expo-router'

import { palette } from '../../utils/theme'

export default function FarmerLayout() {
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
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="requests" options={{ title: 'Buyer Inquiries' }} />
      <Stack.Screen name="my-listings" options={{ title: 'My Listings' }} />
      <Stack.Screen name="create-listing" options={{ title: 'Create Listing' }} />
      <Stack.Screen name="edit-listing/[id]" options={{ title: 'Edit Listing' }} />
    </Stack>
  )
}
