import { Tabs } from 'expo-router'

import { palette } from '../../utils/theme'

export default function BuyerLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.sageDark,
        tabBarInactiveTintColor: palette.muted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        headerShadowVisible: false,
        headerTintColor: palette.soil,
        headerStyle: { backgroundColor: palette.cream },
        headerBackTitleVisible: false,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        sceneStyle: { backgroundColor: palette.cream },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Home',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          href: null,
          title: 'Buyer Dashboard',
        }}
      />
    </Tabs>
  )
}
